# HRA chat-history corpus

Four synthetic chat histories from staff at **Halden & Reyes Architects**, a
fictional 140-person architecture firm. Built for pattern-mining: the point is
to find the repeatable work buried in these transcripts and turn it into tools.

Window: **2 Mar 2026 → 18 Sep 2026** (~6.5 months). Same firm, same projects,
same milestones across all four — the personas occasionally reference each other.

## The four

| # | Persona | Role | Sessions | Turns | Words |
|---|---|---|---:|---:|---:|
| 1 | Priya Raghunathan | BIM Coordinator — clash detection & model coordination | 20 | 276 | 24,478 |
| 2 | Marcus Oyelaran | Project Financial Analyst — WIP, cash flow, AR | 20 | 252 | 26,099 |
| 3 | Dana Whitfield | Ops & IT Procurement — vendor security & due diligence | 20 | 327 | 26,197 |
| 4 | Tomás Ferreira | Senior Architect / Specifier — specs & submittal review | 20 | 316 | 28,887 |
| | | **Total** | **80** | **1,171** | **105,661** |

## Files

- `markdown/` — human-readable transcripts, one file per persona.
- `json/` — same content, structured. See `FORMAT.md` for the schema.
- `WORLD.md` — the shared firm bible: projects, people, consultants, milestones.
- `FORMAT.md` — schema and generation spec.

## Loading the JSON

```bash
# every user turn across all four personas, one per line
node -e '
const fs=require("fs");
for (const f of fs.readdirSync("json")) {
  const d=JSON.parse(fs.readFileSync("json/"+f,"utf8"));
  for (const s of d.sessions)
    for (const t of s.turns)
      if (t.role==="user")
        console.log([d.persona.id,s.id,s.project,t.at,JSON.stringify(t.content)].join("\t"));
}'
```

Useful fields for slicing: `sessions[].project`, `sessions[].tags`,
`sessions[].model`, `sessions[].started_at`, `turns[].role`.

## What was deliberately planted

Each transcript carries the friction that motivates tool-building — recurring
context re-priming, fixed cadences, hand-respecified output formats, scripts
written and then lost, firm rules the assistant never retains, and copy-paste
round trips between chat and the systems of record. The analysis is yours; this
is the raw material.

## Shared milestones to anchor cross-persona analysis

- 20 Mar — Mercer 75% CD set
- 17 Apr — Bayline permit submission
- 1 May — fiscal Q3 / forecast scramble
- 29 May — Mercer bid set
- 12 Jun — Northgate GMP reconciliation
- 6 Jul — Kestrel construction start
- 14 Aug — Mercer construction administration begins
- 9 Sep — principals' quarterly review (all four personas write a one-pager)
