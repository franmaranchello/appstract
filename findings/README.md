# findings

Signals and tool opportunities mined from `chat-histories/`, rendered in the Modul design system.

- `opportunities.mjs` — the nine opportunities: signals, cost, repeated outputs, evidence sessions, snapshot turns, proposed plan.
- `template.html` — the page (three design directions: A Ledger, B Board, C Desk), Modul tokens inlined.
- `build.mjs` — resolves sessions and snapshot turns from the JSON corpus and writes `dist/signals.html`.

```bash
node findings/build.mjs
```
