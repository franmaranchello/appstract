import assert from "node:assert/strict";
import test from "node:test";
import {
  handleGBrainApi,
  rememberApp,
  searchApps,
  serializeAppPage,
  type AppMemoryRecord,
  type GBrainRunner,
} from "./gbrain.ts";

const record: AppMemoryRecord = {
  schemaVersion: 1,
  appId: "appstract.clash-check",
  name: "Clash detection",
  task: "Clash coordination",
  presentations: ["baseline", "non-color"],
  manifestUrl: "http://127.0.0.1:5186/app-manifest.json",
  evidence: [
    {
      sessionId: "cd-003",
      quote: "collapse raw rows",
      author: "Priya Raghunathan",
    },
  ],
  verifiedAt: "2026-09-27T20:00:00.000Z",
};

test("serializes a canonical page with machine-readable app metadata", () => {
  const page = serializeAppPage(record);
  assert.match(page, /^---\ntitle: "Appstract app: Clash detection"/);
  assert.match(page, /APPSTRACT_APP_RECORD_V1\n\{"schemaVersion":1,/);
  assert.match(page, /## Source evidence/);
  assert.match(page, /cd-003/);
});

test("remember writes the canonical page through gbrain without a shell", async () => {
  let call: { args: string[]; input?: string } | undefined;
  const runner: GBrainRunner = async (args, input) => {
    call = { args, input };
    return '{"status":"created","slug":"appstract/apps/appstract-clash-check"}';
  };
  const result = await rememberApp(record, runner);
  assert.equal(result.available, true);
  assert.equal(result.pageSlug, "appstract/apps/appstract-clash-check");
  assert.deepEqual(call?.args, [
    "put",
    "appstract/apps/appstract-clash-check",
    "--force",
    "--json",
  ]);
  assert.match(call?.input || "", /APPSTRACT_APP_RECORD_V1/);
});

test("search returns only valid Appstract app pages", async () => {
  const runner: GBrainRunner = async (args) => {
    assert.deepEqual(args, [
      "search",
      "color blind clash app appstract app catalog",
      "--limit",
      "5",
      "--json",
    ]);
    return JSON.stringify([
      {
        slug: "appstract/apps/appstract-clash-check",
        title: "Appstract app: Clash detection",
        score: 0.91,
        chunk_text: `APPSTRACT_APP_RECORD_V1\n${JSON.stringify(record)}\n\n# Clash detection`,
      },
      {
        slug: "notes/unrelated",
        score: 0.99,
        chunk_text: `APPSTRACT_APP_RECORD_V1\n${JSON.stringify({
          ...record,
          appId: "foreign",
        })}`,
      },
    ]);
  };
  const result = await searchApps("color blind clash app", runner);
  assert.equal(result.available, true);
  assert.deepEqual(result.matches, [
    {
      appId: record.appId,
      name: record.name,
      pageSlug: "appstract/apps/appstract-clash-check",
      score: 0.91,
    },
  ]);
});

test("adapter failures are explicit and fail open", async () => {
  const runner: GBrainRunner = async () => {
    throw Object.assign(new Error("spawn gbrain ENOENT"), { code: "ENOENT" });
  };
  assert.deepEqual(await rememberApp(record, runner), {
    available: false,
    error: "GBrain is not installed or is unavailable.",
  });
  assert.deepEqual(await searchApps("clash", runner), {
    available: false,
    matches: [],
    error: "GBrain is not installed or is unavailable.",
  });
});

test("search rejects malformed output instead of inventing a match", async () => {
  const runner: GBrainRunner = async () => "not-json";
  assert.deepEqual(await searchApps("clash", runner), {
    available: false,
    matches: [],
    error: "GBrain returned an unreadable search response.",
  });
});

test("HTTP routing validates methods, payloads and body size", async () => {
  const runner: GBrainRunner = async () => "[]";
  assert.equal(
    (
      await handleGBrainApi(
        { method: "GET", path: "/api/gbrain/apps/search", body: "" },
        runner,
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await handleGBrainApi(
        {
          method: "POST",
          path: "/api/gbrain/apps/search",
          body: JSON.stringify({ request: "" }),
        },
        runner,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await handleGBrainApi(
        {
          method: "POST",
          path: "/api/gbrain/apps/search",
          body: "x".repeat(65_537),
        },
        runner,
      )
    ).status,
    413,
  );
});
