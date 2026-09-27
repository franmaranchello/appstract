# Output format spec

Each persona produces exactly two files:

- `/Users/alexselig/chat-histories/markdown/<slug>.md`
- `/Users/alexselig/chat-histories/json/<slug>.json`

The two files must contain **the same conversations, turn for turn**. Generate
the JSON first, then render the markdown from it (by hand or with a small
throwaway node script — delete the script when done).

## JSON schema

```json
{
  "persona": {
    "id": "clash-detection",
    "name": "Priya Raghunathan",
    "role": "BIM Coordinator",
    "firm": "Halden & Reyes Architects",
    "office": "Seattle",
    "tools_used": ["Revit 2026", "Navisworks Manage", "..."],
    "corpus_window": { "start": "2026-03-02", "end": "2026-09-18" },
    "session_count": 20
  },
  "sessions": [
    {
      "id": "cd-001",
      "title": "Short human title, lowercase-ish, how a person would name a chat",
      "started_at": "2026-03-04T09:12:00-08:00",
      "model": "GPT-5.4",
      "project": "Bayline",
      "tags": ["navisworks", "clash-matrix", "false-positives"],
      "turns": [
        { "n": 1, "role": "user",      "at": "2026-03-04T09:12:00-08:00", "content": "..." },
        { "n": 2, "role": "assistant", "at": "2026-03-04T09:12:31-08:00", "content": "..." }
      ]
    }
  ]
}
```

Rules:
- `id` prefixes: `cd-` clash, `fin-` finance, `ven-` vendor, `spec-` specs.
- Turn timestamps advance realistically within a session (seconds for the
  assistant, tens of seconds to many minutes for the user; sometimes a 40-minute
  gap mid-session because they went to a meeting).
- Content is plain text with `\n` newlines. Markdown inside content is fine and
  expected (tables, code fences, bullet lists) — that is how these tools reply.
- Must be valid JSON. Validate with `node -e "JSON.parse(require('fs').readFileSync('<path>','utf8'))"` before finishing.

## Markdown rendering

```markdown
# Chat history — Priya Raghunathan, BIM Coordinator

**Halden & Reyes Architects** · Seattle · 2 Mar 2026 – 18 Sep 2026 · 20 sessions

---

## Session 1 — clash matrix for bayline, again
`cd-001` · 4 Mar 2026, 9:12 AM · **GPT-5.4** · Project: Bayline
Tags: `navisworks` `clash-matrix` `false-positives`

**Priya** · 9:12 AM
> ...user text, blockquoted, blank `>` between paragraphs...

**GPT-5.4** · 9:12 AM

...assistant text, NOT blockquoted, rendered normally so tables/code survive...

---
```

Use the persona's first name as the user label and the model name as the
assistant label.

## Size target

- **20 sessions** per persona.
- Sessions vary: some are 4 turns (2 exchanges, a quick one-off), most are
  10–18 turns, and 3–4 are long grinding 24–30 turn sessions.
- User messages: 20–400 words. Frequently include pasted artefacts — CSV rows,
  clash report exports, error strings, spec paragraphs, invoice tables, a
  vendor's security questionnaire answers.
- Assistant messages: 80–350 words typically, occasionally a long structured
  answer with a table or a script.
- Target roughly 25,000–35,000 words per persona.

## The single most important instruction

The reason this corpus exists is to reveal **repeatable work** that should have
been a tool instead of a chat. So bake in, naturally and without ever naming it:

1. **Boilerplate re-priming.** The same 100-word context paste ("I'm a BIM
   coordinator at a 140-person firm, we use Navisworks, our clash matrix is
   ...") at the top of most sessions, drifting slightly each time.
2. **A stable weekly/monthly cadence.** The same job done on the same rhythm
   with different inputs.
3. **Hand-built artefacts.** The user asks for the same output shape over and
   over — a table, a memo, a scorecard — and re-specifies the shape each time.
4. **Copy-paste round trips.** Export from a system → paste into chat → paste
   result back into another system. Mention the friction.
5. **Rules the model can't remember.** Firm standards, tolerances, thresholds
   the user re-states constantly and the model still gets wrong.
6. **Escalating scripts.** The user gradually gets the model to write Python /
   Dynamo / PowerQuery, loses the script, asks for it again.
7. **Quality drift.** Same request, different answer, user notices and complains.
8. **Abandoned threads.** A session that just stops because they ran out of time.
