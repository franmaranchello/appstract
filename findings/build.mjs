// node findings/build.mjs  →  findings/dist/signals.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPPS, SIGNALS } from "./opportunities.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const jsonDir = path.join(here, "..", "chat-histories", "json");

const sessions = {};
const primeIds = [];
const words = (s) => s.toLowerCase().match(/[a-z0-9'<>\-\/.$]+/g) || [];

for (const f of fs.readdirSync(jsonDir).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(jsonDir, f), "utf8"));
  const first = d.persona.name.split(" ")[0];
  for (const s of d.sessions) sessions[s.id] = { ...s, persona: first };
  // Re-priming: the persona's standing context paragraph (Dana's settles in her 2nd session).
  const ref = d.sessions[d.persona.id === "vendor-review" ? 1 : 0].turns[0].content.split(/\n\n/)[0];
  const bw = new Set(words(ref));
  for (const s of d.sessions) {
    let best = 0;
    for (const t of s.turns.filter((t) => t.role === "user"))
      for (const p of t.content.split(/\n\n/)) {
        const pw = new Set(words(p));
        if (pw.size < 15) continue;
        let i = 0;
        for (const w of pw) if (bw.has(w)) i++;
        best = Math.max(best, i / bw.size);
      }
    if (best > 0.5) primeIds.push(s.id);
  }
}

const brief = (s) => ({ id: s.id, date: s.started_at.slice(0, 10), title: s.title, persona: s.persona, model: s.model, project: s.project });

const opps = OPPS.map((o) => {
  const ids = o.sessions === "@prime" ? primeIds : o.sessions;
  const snaps = o.snaps.map((sn) => {
    const s = sessions[sn.sid];
    if (!s) throw new Error("missing session " + sn.sid);
    const t = sn.match
      ? s.turns.find((t) => (!sn.role || t.role === sn.role) && sn.match.test(t.content))
      : s.turns.find((t) => t.n === sn.n);
    if (!t) throw new Error("missing turn in " + sn.sid);
    let text = t.content;
    if (sn.para) text = text.split(/\n\n/).slice(0, sn.para).join("\n\n");
    return { sid: s.id, n: t.n, role: t.role, speaker: t.role === "user" ? s.persona : s.model, at: t.at, title: s.title, text: text.slice(0, 3200), cap: sn.cap, flag: sn.flag || null };
  });
  return { ...o, sessions: ids.map((id) => brief(sessions[id])), snaps };
});

const data = { signals: SIGNALS, opps, corpus: { sessions: Object.keys(sessions).length, prime: primeIds.length, start: "2026-03-02", end: "2026-09-18" } };
const tpl = fs.readFileSync(path.join(here, "template.html"), "utf8");
const json = JSON.stringify(data).replace(/</g, "\\u003c");
fs.mkdirSync(path.join(here, "dist"), { recursive: true });
fs.writeFileSync(path.join(here, "dist", "signals.html"), tpl.replace("/*__DATA__*/null", json));
console.log("wrote dist/signals.html", opps.length, "opportunities,", primeIds.length, "re-primed sessions");
