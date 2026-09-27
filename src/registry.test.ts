import assert from "node:assert/strict";
import test from "node:test";
import { createDemoApp, extendApp } from "./domain.ts";
import {
  AppDiscoveryError,
  discoverClashApp,
  mergeDiscoveredApp,
} from "./registry.ts";

const manifest = {
  schemaVersion: 1,
  appId: "appstract.clash-check",
  name: "Clash detection",
  fixtureId: "sample-building",
  baselineVersionId: "clash-v1",
  presentations: ["baseline", "non-color"],
};

test("discovery reads the running app manifest and uses its directory as the launch root", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, options: RequestInit) => {
    assert.equal(String(url), "http://localhost:5174/app/app-manifest.json");
    assert.equal(options.cache, "no-store");
    return new Response(JSON.stringify(manifest));
  });
  const app = await discoverClashApp("http://localhost:5174/app");
  assert.equal(app.id, "appstract.clash-check");
  assert.equal(app.name, "Clash detection");
  assert.equal(app.currentVersionId, "clash-v1");
  assert.equal(app.url, "http://localhost:5174/app/");
});

test("malformed or foreign manifests fail instead of creating a local fallback", async (t) => {
  for (const value of [
    { ...manifest, schemaVersion: 2 },
    { ...manifest, appId: "foreign" },
    { ...manifest, presentations: ["baseline"] },
    { ...manifest, baselineVersionId: "latest" },
    {},
  ]) {
    const mock = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(JSON.stringify(value)),
    );
    await assert.rejects(
      discoverClashApp("http://localhost:5174"),
      (error: unknown) =>
        error instanceof AppDiscoveryError && error.code === "INVALID_MANIFEST",
    );
    mock.mock.restore();
  }
});

test("offline discovery returns an actionable named failure", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    discoverClashApp("http://localhost:5174"),
    (error: unknown) =>
      error instanceof AppDiscoveryError &&
      error.code === "DISCOVERY_FAILED" &&
      error.message.includes("Start it"),
  );
  await assert.rejects(
    discoverClashApp("javascript:alert(1)"),
    (error: unknown) =>
      error instanceof AppDiscoveryError && error.code === "INVALID_URL",
  );
});

test("aborted discovery is bounded even if a transport does not answer", async (t) => {
  t.mock.method(globalThis, "fetch", () => new Promise<Response>(() => {}));
  const controller = new AbortController();
  const pending = discoverClashApp("http://localhost:5174", controller.signal);
  controller.abort();
  await assert.rejects(
    pending,
    (error: unknown) =>
      error instanceof AppDiscoveryError && error.code === "DISCOVERY_ABORTED",
  );
});

test("rediscovery updates the address while preserving v2, its requester and v1", () => {
  const saved = extendApp(
    { ...createDemoApp("Original request"), url: "http://localhost:5000/" },
    "I'm color-blind can you make the same tool easier to read",
    "Marcus",
  );
  const discovered = {
    ...createDemoApp("Discovered"),
    url: "http://localhost:5174/",
  };
  const merged = mergeDiscoveredApp(discovered, saved);
  assert.deepEqual(merged.versions, saved.versions);
  assert.equal(merged.currentVersionId, "clash-v2");
  assert.equal(merged.url, discovered.url);
  assert.deepEqual(
    mergeDiscoveredApp(discovered, { ...saved, id: "another-app" }),
    discovered,
  );
  assert.deepEqual(
    mergeDiscoveredApp(discovered, {
      ...saved,
      versions: saved.versions.map((v) => ({ ...v, id: "foreign" })),
    }),
    discovered,
  );
});

test("unresponsive discovery times out instead of leaving the catalog loading forever", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", () => new Promise<Response>(() => {}));
  const pending = discoverClashApp("http://localhost:5174");
  const check = assert.rejects(
    pending,
    (error: unknown) =>
      error instanceof AppDiscoveryError && error.code === "DISCOVERY_TIMEOUT",
  );
  t.mock.timers.tick(4000);
  await check;
});
