import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  request as httpRequest,
  type RequestListener,
} from "node:http";
import { createHmac } from "node:crypto";
import {
  loadHistories,
  validatePatterns,
  discoveryPrompt,
  type History,
} from "./patterns.ts";
import { createDiscoveryHandler } from "./discovery.ts";
import type { DiscoveryJob } from "../src/discovery-types.ts";

const root = process.cwd();
const histories = await loadHistories(root);
const history = histories[0];
function answer(h: History = history) {
  return {
    patterns: [
      {
        title: "Repeatable coordination",
        category: "BIM",
        description: "Review coordination requests.",
        outcome: "Consistent coordination reports.",
        input: "Coordination export",
        output: "Issue list",
        workflow: "clash-coordination",
        signals: ["Repeated requests across sessions"],
        evidence: h.sessions
          .slice(0, 2)
          .map((s) => ({
            sessionId: s.id,
            turn: s.turns.find((t) => t.role === "user")!.n,
            quote: s.turns.find((t) => t.role === "user")!.content.slice(0, 80),
          })),
      },
    ],
  };
}
const secret = "test-only-secret-never-a-real-key-12345";
async function server(handler: RequestListener) {
  const instance = createServer(handler);
  await new Promise<void>((resolve) =>
    instance.listen(0, "127.0.0.1", resolve),
  );
  const url = `http://127.0.0.1:${(instance.address() as { port: number }).port}`;
  return {
    url,
    close: () =>
      new Promise<void>((resolve) => {
        instance.closeAllConnections();
        instance.close(() => resolve());
      }),
  };
}

test("full transcript prompt preserves source turns and asks for evidence, not app generation", () => {
  const prompt = discoveryPrompt(history);
  assert.ok(prompt.includes(JSON.stringify(history)));
  assert.match(prompt, /untrusted DATA/);
  assert.match(prompt, /Do not build or modify an app/);
});
test("valid citations derive identities, unique session counts and dates from source", () => {
  const [pattern] = validatePatterns(JSON.stringify(answer()), history);
  assert.equal(pattern.sourceId, history.persona.id);
  assert.equal(pattern.evidence[0].author, history.persona.name);
  assert.equal(pattern.sessionIds.length, 2);
  assert.equal(pattern.id, `qm-${history.persona.id}-1`);
  assert.deepEqual(validatePatterns('{"patterns":[]}', history), []);
});
test("rejects invented quotes, assistant citations, duplicate citations and non-recurring work", () => {
  const bad = answer();
  bad.patterns[0].evidence[0].quote =
    "This quote does not exist in the transcript.";
  assert.throws(
    () => validatePatterns(JSON.stringify(bad), history),
    /could not be verified/,
  );
  const assistant = answer();
  const s = history.sessions[0];
  const t = s.turns.find((t) => t.role === "assistant")!;
  assistant.patterns[0].evidence[0] = {
    sessionId: s.id,
    turn: t.n,
    quote: t.content.slice(0, 80),
  };
  assert.throws(
    () => validatePatterns(JSON.stringify(assistant), history),
    /could not be verified/,
  );
  const duplicate = answer();
  duplicate.patterns[0].evidence.push(duplicate.patterns[0].evidence[0]);
  assert.throws(
    () => validatePatterns(JSON.stringify(duplicate), history),
    /duplicate/,
  );
  const single = answer();
  single.patterns[0].evidence.pop();
  assert.throws(
    () => validatePatterns(JSON.stringify(single), history),
    /recurring-session/,
  );
  assert.throws(
    () => validatePatterns("not JSON", history),
    /valid pattern JSON/,
  );
  assert.throws(
    () => validatePatterns(JSON.stringify(answer(histories[1])), history),
    /could not be verified/,
  );
});

test('bridge requires token, restricts routes, and hides infrastructure errors', async () => {
  const handler=createDiscoveryHandler(root,{QM_PORTAL_URL:'http://127.0.0.1:1'},secret);
  const api=await server((req,res)=>{void handler(req,res,()=>{res.statusCode=404;res.end();});});
  try {
    assert.equal((await fetch(api.url+'/api/discovery/status')).status,401);
    assert.equal((await fetch(api.url+'/api/discovery/status',{headers:{authorization:'Bearer wrong'}})).status,401);
    const headers={authorization:`Bearer ${secret}`};
    assert.equal((await fetch(api.url+'/api/discovery/admin',{headers})).status,404);
    const response=await fetch(api.url+'/api/discovery/status',{headers});
    const status=await response.json();assert.equal(status.configured,false);assert.ok(!JSON.stringify(status).includes(secret));
    assert.equal((await fetch(api.url+'/api/discovery/jobs',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'bad json'})).status,400);
    assert.equal((await fetch(api.url+'/api/discovery/jobs',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'x'.repeat(4100)})).status,413);
  } finally {await api.close();}
});
