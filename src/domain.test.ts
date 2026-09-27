import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLaunchUrl,
  createDemoApp,
  extendApp,
  routeRequest,
  validateApp,
} from "./domain.ts";

test("creation produces one baseline version and survives storage roundtrip", () => {
  const app = createDemoApp("Check the sample model for clashes");
  assert.equal(app.name, "Clash detection");
  assert.equal(app.id, "appstract.clash-check");
  assert.equal(app.currentVersionId, "clash-v1");
  assert.equal(app.versions.length, 1);
  assert.equal(app.versions[0].presentation, "baseline");
  assert.equal(app.currentVersionId, app.versions[0].id);
  assert.deepEqual(validateApp(JSON.parse(JSON.stringify(app))), app);
});

test("extension preserves identity and v1; repeated extension is idempotent", () => {
  const original = createDemoApp("Clash check");
  const extended = extendApp(
    original,
    "Make the clash report color-blind friendly",
  );
  assert.equal(extended.id, original.id);
  assert.equal(original.versions.length, 1);
  assert.deepEqual(extended.versions[0], original.versions[0]);
  assert.equal(extended.versions[1].presentation, "non-color");
  assert.equal(extended.currentVersionId, extended.versions[1].id);
  assert.strictEqual(extendApp(extended, "Again"), extended);
});

test("compatible requests clarify when unavailable, reuse, extend, then reuse non-color version", () => {
  const request = "Run the clash check on the sample model";
  assert.equal(routeRequest(request, null).action, "CLARIFY");
  const app = createDemoApp(request);
  assert.equal(routeRequest(request, app).action, "REUSE");
  const accessible =
    "Make the clash report usable for someone who cannot distinguish red and green";
  assert.equal(routeRequest(accessible, app).action, "EXTEND");
  const extended = extendApp(app, accessible);
  assert.equal(routeRequest(accessible, extended).action, "REUSE");
  assert.equal(
    routeRequest(accessible, extended).versionId,
    extended.currentVersionId,
  );
});

test("unrelated, ambiguous and incompatible inputs never create or reuse", () => {
  for (const request of [
    "",
    "Help me",
    "Prepare finance report",
    "Group Navisworks XML clash issues",
    "Run clash detection on IFC",
  ]) {
    assert.equal(routeRequest(request, null).action, "CLARIFY");
    assert.equal(
      routeRequest(request, createDemoApp("Clash check")).action,
      "CLARIFY",
    );
  }
});

test("launch pins version and encodes the sample contract without request text", () => {
  const app = {
    ...createDemoApp("Sensitive request text"),
    url: "https://example.com/app?theme=modul#old",
  };
  const url = new URL(buildLaunchUrl(app, app.versions[0])!);
  const fragment = new URLSearchParams(url.hash.slice(1));
  assert.equal(fragment.get("appId"), app.id);
  assert.equal(fragment.get("appVersionId"), app.currentVersionId);
  assert.equal(fragment.get("fixtureId"), "sample-building");
  assert.equal(fragment.get("mode"), "sample");
  assert.equal(fragment.get("presentation"), "baseline");
  assert.ok(fragment.get("sourceRequestId"));
  assert.equal(url.searchParams.get("theme"), "modul");
  assert.ok(!url.toString().includes("Sensitive"));
});

test("launch permits HTTPS and loopback HTTP; blocks missing, unsafe and foreign versions", () => {
  const app = createDemoApp("Clash check");
  for (const url of [
    "",
    "javascript:alert(1)",
    "data:text/html,x",
    "file:///tmp/app",
    "http://example.com",
    "https://user:pass@example.com",
  ]) {
    assert.equal(buildLaunchUrl({ ...app, url }, app.versions[0]), null);
  }
  for (const url of [
    "https://example.com",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://[::1]:5174",
  ]) {
    assert.ok(buildLaunchUrl({ ...app, url }, app.versions[0]));
  }
  assert.equal(
    buildLaunchUrl(
      { ...app, url: "https://example.com" },
      { ...app.versions[0], id: "foreign" },
    ),
    null,
  );
});

test("reload rejects malformed records, duplicate versions and missing current version", () => {
  const app = createDemoApp("Clash check");
  for (const value of [
    null,
    [],
    {},
    { ...app, currentVersionId: "missing" },
    { ...app, url: "javascript:alert(1)" },
    { ...app, versions: [] },
    { ...app, versions: [app.versions[0], app.versions[0]] },
    {
      ...app,
      versions: [{ ...app.versions[0], presentation: "arbitrary-code" }],
    },
    { ...app, createdAt: "not a date" },
  ])
    assert.equal(validateApp(value), null);
});

test("a second teammate can extend the same tool without repeating its task name", () => {
  const app = createDemoApp("Run clash detection");
  const request = "I'm color-blind can you make the same tool easier to read";
  assert.equal(routeRequest(request, app).action, "EXTEND");
  const extended = extendApp(app, request, "Marcus Oyelaran");
  assert.equal(extended.currentVersionId, "clash-v2");
  assert.equal(extended.versions[1].requestedBy, "Marcus Oyelaran");
  assert.deepEqual(validateApp(extended), extended);
  assert.equal(routeRequest(request, extended).action, "REUSE");
  assert.equal(routeRequest("Run clash detection", app).action, "REUSE");
  assert.equal(
    routeRequest("Make this finance report accessible", app).action,
    "CLARIFY",
  );
  assert.equal(
    routeRequest("I'm color-blind, make the same invoice easier to read", app)
      .action,
    "CLARIFY",
  );
});

test("return links are encoded and restricted to supported origins", () => {
  const app = {
    ...createDemoApp("Run clash detection"),
    url: "http://localhost:5174/",
  };
  const launch = new URL(
    buildLaunchUrl(app, app.versions[0], "http://localhost:5173/?tab=apps")!,
  );
  assert.equal(
    new URLSearchParams(launch.hash.slice(1)).get("returnTo"),
    "http://localhost:5173/?tab=apps",
  );
  const unsafe = new URL(
    buildLaunchUrl(app, app.versions[0], "javascript:alert(1)")!,
  );
  assert.equal(
    new URLSearchParams(unsafe.hash.slice(1)).has("returnTo"),
    false,
  );
  assert.equal(
    validateApp({ ...app, versions: [{ ...app.versions[0], requestedBy: 9 }] }),
    null,
  );
});
