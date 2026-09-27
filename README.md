# Appstract

Interactive Modul UI mockup for turning recurring organizational work into reusable apps.

## Run and iterate

Use Node 22.12+ (built here with Node 26.3.1).

```bash
npm ci
npm run dev
```

Open the local URL Vite prints, normally `http://127.0.0.1:5173`.

```bash
npm test       # routing, versions, persistence validation, safe app URLs
npm run build  # TypeScript check and production build
npm run preview
```

![Appstract history view](docs/mockup-history.png)

## What works

- History selection and original JSON inspection for the four supplied HRA personas.
- Four prepared opportunity cards, with recurrence counts and exact source excerpts.
- App brief, local app registration, persistent catalog and v1/v2 configuration history.
- New request demo: create, reuse, extend or clarify; incompatible XML triage stays separate from sample geometry.
- External app URL setup, versioned launch fragment and a reset flow.
- Responsive Modul styling, bundled fonts, keyboard controls and native dialogs.

**This is a UI mockup.** Discovery is manually prepared from the actual synthetic corpus; routing uses explicit demo rules. No live model, app code generation, QM or GBrain connection runs here. Only the clash app is registered in this demo; the other opportunities can be reviewed and shortlisted for the current session.

## Demo walkthrough

1. Select histories → **Find patterns** → open **Clash issue triage** with **More** → **Build tool**.
2. Read the team-selected sample-clash scope → **Add demo app**.
3. Open **New request**, choose the color-blind-friendly example, then **Find the right app** → **Create v2 configuration**.
4. The catalog retains v1 and shows v2 on the same app. Repeat the request to see REUSE. Try the XML example to see CLARIFY.
5. Refresh to confirm persistence. **Reset demo** clears only this browser's demo state.

The separate generated app repository owns sample fixtures, all computation and result UI. Appstract does not calculate clashes or claim a successful run just because a tab opened.

## Connect your teammate's app

Click **Connect** in the catalog and enter its HTTPS or local HTTP preview URL. Alternatively, copy `.env.example` to `.env.local` and set `VITE_DEMO_APP_URL` before creating the first app. The UI setting can override it.

The launch URL fragment contains `appId`, `appVersionId`, `sourceRequestId`, `mode=sample`, `presentation=baseline|non-color`, and `fixtureId=sample-building`. The app reads `new URLSearchParams(location.hash.slice(1))`. Agree on that fixture ID or change it in `src/domain.ts`. Request text and credentials are not included. The sourceRequestId is a local demo marker, not an authenticated identity.

## Where to change things

| File | Responsibility |
|---|---|
| `src/App.tsx` | Views, interactions, dialogs and local state |
| `src/styles.css` | Modul tokens, layouts and responsive styling |
| `src/data.ts` | Prepared patterns, derived metrics and source-backed evidence |
| `src/opportunities.ts` | Ledger copy per pattern: proposal, plan, cost and which turns to show |
| `src/markdown.tsx` | The small markdown subset used to render corpus turns |
| `src/domain.ts` | Demo routing, app versions, validation and launch URL |
| `chat-histories/json/` | Original supplied synthetic conversations |

The corpus is bundled for an immediately runnable offline mockup, so the build reports a large-chunk warning. Lazy-loading source histories is a future optimization, not a missing runtime dependency. Fonts are bundled locally.

## Planning references

- [90-minute build plan](docs/hackathon-plan.md)
- [Separate app handoff](docs/app-integration-contract.md)
- [Modul design system](DESIGN.md)
- [Rehearsal checklist](docs/hackathon-test-plan.md)
- [After the hackathon](TODOS.md)

Build and seven domain tests pass. Browser-checked: source→app→extension flow, persistence, exact reuse, XML mismatch, and 320px reflow. External app computation and actual provider integrations were not exercised.
