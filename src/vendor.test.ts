import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { appCatalog, requestAppKind } from "./catalog.ts";
import {
  createCatalogApp,
  createDemoApp,
  extendApp,
  routeRequest,
  buildLaunchUrl,
} from "./domain.ts";
import { discoverApp, mergeDiscoveredApp } from "./registry.ts";
import { loadSaved } from "./storage.ts";

const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../public/apps/vendor-approval/app-manifest.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const vendor = () => ({
  ...createCatalogApp("vendor", appCatalog.vendor.request),
  url: "https://appstract.example/apps/vendor-approval/",
});

test("the bundled vendor manifest discovers a distinct baseline app", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(
      String(url),
      "https://appstract.example/apps/vendor-approval/app-manifest.json",
    );
    return new Response(JSON.stringify(manifest));
  });
  const app = await discoverApp("vendor", vendor().url);
  assert.equal(app.id, "appstract.vendor-approval");
  assert.equal(app.currentVersionId, "vendor-v1");
  assert.equal(app.versions.length, 1);
  assert.equal(app.url, vendor().url);
  await assert.rejects(discoverApp("clash", vendor().url), {
    code: "INVALID_MANIFEST",
  });
});

test("vendor discovery rejects foreign versions, unsupported presentations and extra fields", async (t) => {
  for (const bad of [
    { ...manifest, baselineVersionId: "clash-v1" },
    { ...manifest, presentations: ["baseline", "non-color"] },
    { ...manifest, fixtureId: "sample-building" },
    { ...manifest, url: "https://foreign.example" },
  ]) {
    const mock = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(JSON.stringify(bad)),
    );
    await assert.rejects(discoverApp("vendor", vendor().url), {
      code: "INVALID_MANIFEST",
    });
    mock.mock.restore();
  }
});

test("requests select the correct app and never apply clash extensions to vendor approval", () => {
  const app = vendor();
  for (const request of [
    "Review vendor documents",
    "Open vendor approvals",
    "Show the vendors portfolio",
    "Submit vendor for security review",
  ]) {
    assert.equal(requestAppKind(request, "clash"), "vendor");
    assert.equal(routeRequest(request, app).action, "REUSE");
    assert.equal(routeRequest(request, app).versionId, "vendor-v1");
    assert.equal(routeRequest(request, null).action, "CLARIFY");
    assert.equal(
      routeRequest(request, createDemoApp("clash")).action,
      "CLARIFY",
    );
  }
  for (const request of [
    "Make the vendor approval app color-blind friendly",
    "Import vendor questionnaires",
    "Generate a six-category vendor scorecard",
    "Automatically approve vendors",
    "Review vendor invoices",
    "Run clash detection",
    "Make this app accessible",
  ]) {
    assert.equal(routeRequest(request, app).action, "CLARIFY", request);
  }
  assert.equal(requestAppKind("Run clash detection", "vendor"), "clash");
  assert.equal(
    requestAppKind("Make the same app accessible", "vendor"),
    "vendor",
  );
  assert.strictEqual(extendApp(app, "Make it accessible"), app);
});

test("vendor launch pins its own contract, preserves hash routing and omits conversation text", () => {
  const app = vendor();
  const url = new URL(
    buildLaunchUrl(app, app.versions[0], "https://appstract.example/#request")!,
  );
  assert.equal(url.hash, "#/vendors");
  assert.equal(url.searchParams.get("appId"), app.id);
  assert.equal(url.searchParams.get("fixtureId"), "sample-vendors");
  assert.equal(url.searchParams.get("appVersionId"), "vendor-v1");
  assert.equal(
    url.searchParams.get("returnTo"),
    "https://appstract.example/#request",
  );
  assert.ok(!url.href.includes(encodeURIComponent(app.versions[0].request)));
  assert.equal(buildLaunchUrl(app, createDemoApp("clash").versions[0]), null);
});

test("rediscovery preserves vendor history but cannot import clash versions", () => {
  const saved = vendor();
  const discovered = {
    ...vendor(),
    url: "https://new.example/apps/vendor-approval/",
  };
  assert.deepEqual(
    mergeDiscoveredApp(discovered, saved).versions,
    saved.versions,
  );
  assert.equal(mergeDiscoveredApp(discovered, saved).url, discovered.url);
  assert.deepEqual(
    mergeDiscoveredApp(discovered, createDemoApp("clash")),
    discovered,
  );
  assert.deepEqual(
    mergeDiscoveredApp(discovered, {
      ...saved,
      versions: [{ ...saved.versions[0], presentation: "non-color" }],
    }),
    discovered,
  );
});

test("single-app storage migrates clash v2 and requests without losing them when vendor is added", () => {
  const clash = extendApp(
    createDemoApp("clash"),
    "Labels and shapes",
    "Claudia",
  );
  const event = {
    person: "Claudia",
    request: "Labels and shapes",
    action: "EXTEND",
    versionId: "clash-v2",
    at: new Date().toISOString(),
  };
  const old = loadSaved({
    getItem: () =>
      JSON.stringify({ app: clash, events: [event], analyzed: true }),
  });
  assert.deepEqual(old.apps.clash, clash);
  assert.equal(old.apps.vendor, null);
  assert.equal(old.events[0].appId, clash.id);
  const combined = {
    ...old,
    apps: { ...old.apps, vendor: vendor() },
    activeKind: "vendor",
  };
  assert.deepEqual(
    loadSaved({ getItem: () => JSON.stringify(combined) }),
    combined,
  );
});

test("storage rejects mismatched app slots and tolerates inaccessible storage", () => {
  assert.equal(
    loadSaved({
      getItem: () =>
        JSON.stringify({ apps: { vendor: createDemoApp("clash") } }),
    }).apps.vendor,
    null,
  );
  assert.deepEqual(
    loadSaved({
      getItem: () => {
        throw new Error("denied");
      },
    }).apps,
    { clash: null, vendor: null },
  );
});
