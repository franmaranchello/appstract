import assert from "node:assert/strict";
import test from "node:test";
import { createDemoApp } from "./domain.ts";
import {
  findAppsInGBrain,
  rememberAppInGBrain,
  type GBrainFetch,
} from "./gbrain.ts";

test("browser client remembers an app using selected pattern evidence", async () => {
  let requestBody = "";
  const fetcher: GBrainFetch = async (_url, init) => {
    requestBody = String(init?.body);
    return new Response(
      JSON.stringify({
        available: true,
        pageSlug: "appstract/apps/appstract-clash-check",
      }),
      { headers: { "content-type": "application/json" } },
    );
  };
  const result = await rememberAppInGBrain(
    { ...createDemoApp("request"), url: "http://127.0.0.1:5186/" },
    {
      title: "Clash coordination",
      evidence: [
        {
          sessionId: "cd-003",
          quote: "collapse raw rows",
          author: "Priya Raghunathan",
        },
      ],
    },
    undefined,
    fetcher,
  );
  assert.equal(result.available, true);
  assert.deepEqual(JSON.parse(requestBody).app.presentations, ["baseline"]);
});

test("browser client parses search matches and rejects malformed payloads", async () => {
  const okFetcher: GBrainFetch = async () =>
    new Response(
      JSON.stringify({
        available: true,
        matches: [
          {
            appId: "appstract.clash-check",
            name: "Clash detection",
            pageSlug: "appstract/apps/appstract-clash-check",
            score: 0.8,
          },
        ],
      }),
    );
  const result = await findAppsInGBrain(
    "run clash detection",
    undefined,
    okFetcher,
  );
  assert.equal(result.matches[0]?.appId, "appstract.clash-check");

  const badFetcher: GBrainFetch = async () =>
    new Response(JSON.stringify({ available: true, matches: [{ appId: 3 }] }));
  await assert.rejects(
    findAppsInGBrain("run clash detection", undefined, badFetcher),
    /invalid response/i,
  );
});

test("browser client preserves explicit unavailable responses", async () => {
  const fetcher: GBrainFetch = async () =>
    new Response(
      JSON.stringify({
        available: false,
        matches: [],
        error: "GBrain is not configured.",
      }),
    );
  assert.deepEqual(await findAppsInGBrain("clash", undefined, fetcher), {
    available: false,
    matches: [],
    error: "GBrain is not configured.",
  });
});
