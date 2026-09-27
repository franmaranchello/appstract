# Appstract — 90-minute hackathon build

Scope reset after the user's deadline clarification: **90 minutes remain**. This is the current build scope. The larger platform/integration design is archived in `.context/plans/archive/`; it is not today's implementation checklist. Product direction, Modul and separate app ownership are already settled.

## What must work

1. Select the committed synthetic HRA history and show its source/counts.
2. Show a few repeat-work suggestions with actual source excerpts and honest recurrence counts.
3. Inspect one suggestion, approve its app brief and open the separate clash app as v1.
4. A fresh request finds that app. Exact support reuses v1; the accessibility request creates/selects a v2 presentation configuration for the same app ID.
5. Open v2 in the separate repo's app, visibly retain v1, and preserve the same sample result when only presentation changes.

**Appstract owns history, suggestions, evidence, app catalog, routing and saved version metadata. The separate app repo owns all sample data, computation and result UI.** No geometry code here. No full IFC detector requirement.

## Use what is already here

Latest main fetched and fast-forwarded to `200a80b`. Four JSON histories: 80 sessions, 1,171 turns, 588 user turns. Use `chat-histories/json/` and the schema in `chat-histories/FORMAT.md`; do not also import duplicate Markdown.

Don't invent a new corpus. Show synthetic provenance. Do not equate turns with requests or count one person's repeated context as multiple people. Only count the selected dataset revision.

Priya's source-backed repeated task is Navisworks issue triage (`cd-003/005/006/008/011/015/016/020`), particularly recreating a lost script in `cd-015`. The structured-sample clash app is a **team-selected demo scope**, not an exact input/output match for XML triage. Explain that briefly in the app brief; do not alter the source data or misroute an XML request.

## Three views; one working path

- **History:** supplied dataset selection, counts, Analyze, secondary View JSON.
- **Patterns:** simple list plus source evidence and Create app brief. Show supported candidate families across the four personas, without building all their apps.
- **Apps:** one app detail, v1/v2 history, Open app, New request. Keep the existing ready version usable while an extension is pending/failed.

Use existing Modul tokens in DESIGN.md. No new design exploration. Source evidence and useful outcomes lead; technical identities stay in Details.

## 90-minute allocation

| Minutes | Work | Exit condition |
|---|---|---|
| 0–10 | Freeze the tiny app handoff; check available stack/model/QM/GBrain | App URL + app/version IDs + presentation mode agreed; provider readiness known |
| 10–40 | Build the three views against the actual corpus | Clickable history → cited suggestion → app brief → catalog |
| 40–60 | Wire persistence and the two request paths | Reload retains app/version; exact request reuses; presentation request extends same ID |
| 60–75 | Connect external app and whichever providers passed readiness | v1/v2 visibly open; real integration states shown |
| 75–90 | Rehearse, fix blockers, capture fallback | Three clean runs, no misleading counts/results/integration claims |

Other teammate works on the sample-computing clash app in parallel. No wait for a generalized SDK or production release system. If any stage slips, cut polish/batch/export first; preserve both demo acts and source evidence.

## QM and GBrain, only where immediately useful

**QM:** use an already-running instance for the one approved app build/extension and keep its run/revision link. Do not spend the remaining time deploying QM, forking its UI, creating a generic dispatcher or building restart reconciliation. If not ready inside the first ten minutes, the separate app team supplies the artifact and Appstract labels it registered/prepared. Do not claim live generation.

**GBrain:** if a dedicated connection is ready, explicitly save the app summary + app ID and retrieve it for the second request. Resolve the returned ID against the local catalog. One observed write/read is enough for this demo. No outbox, automatic capture, graph enrichment or custom QM memory-provider integration today. If unavailable, use local catalog matching and say GBrain is not connected.

**History analysis:** prefer the available model connection, processing a visibly selected bounded slice if full-corpus analysis is too slow. If no model is ready, use a clearly labeled prepared analysis whose excerpts/counts were verified against these JSONs; this demonstrates the product flow, not live pattern detection. A provider failure must not silently become a successful recorded response.

Primary references for the integration fit: [QM](https://github.com/yc-software/qm) supports scoped agent work/repositories; [GBrain](https://github.com/garrytan/gbrain) supports source-linked memory/retrieval. No live integration was established during planning.

## Smallest implementation

Reuse a running team stack; otherwise one TypeScript UI with the smallest necessary server adapter for an available model/provider. Persist only the synthetic demo's app/version/request metadata locally. Keep provider secrets on a loopback-only server with same-origin mutation checks; do not put them in frontend code.

App record: stable ID, name, registered app URL, current version. Version: immutable ID, parent version, capability/presentation mode, source request and artifact/config reference. Source evidence references persona/session/turn from the committed JSON. No generic job engine, multi-tenant auth, deployment automation or candidate-release workflow today.

Open the app in a new tab with the agreed app/version/mode values, or use the app team's simplest existing delivery. Do not invent completed run receipts if none are returned. A presentation-config change is labeled configuration, not generated code. See [the reduced handoff](app-integration-contract.md).

## Cut from today

Generic cross-repo builder framework, two-stage release management, durable job/outbox/reconciliation infrastructure, complex browser protocol, arbitrary app provisioning, full corpus connector platform, production auth, embeddings/graph work, ROI, batch creation and export polish. These can follow a convincing working loop.

Batch selection from the original roadmap is explicitly deferred under the 90-minute constraint. The first creation and second reuse/extension acts remain mandatory. Do not spend more time expanding this plan.

## Rehearsal bar

Actual source quotes/counts; visible synthetic/prepared/live labels; v1 opens; exact repetition does not create v2; accessibility configuration gives same app a v2; v1 remains usable; changed presentation does not fabricate changed geometry; reload preserves state; errors stay errors. [Short checklist](hackathon-test-plan.md).
