# Appstract ↔ generated app: hackathon handoff

**90-minute scope.** This replaces the larger proposed integration framework, archived in `.context/plans/archive/full-integration-contract.md`. No framework implementation required.

## Ownership — confirmed by the user

- Appstract: histories, evidence, suggestions, approval, registry IDs, routing and version metadata.
- Separate app repo: canonical sample fixture, units/rule, all sample computation, result/report UI, v1/v2 presentation.
- Appstract never calculates clashes or supplies a competing canonical result set.
- The sibling plan changed concurrently and briefly assumed a parent executor. This explicit user-confirmed boundary supersedes that assumption. Real IFC remains optional; no full IFC/WASM gate today.

## Freeze these fields together in the first ten minutes

```ts
type DemoLaunch = {
  appId: string;
  appVersionId: string;
  sourceRequestId: string;
  mode: 'sample';
  presentation: 'baseline' | 'non-color';
  fixtureId: string; // owned and interpreted by the app repo
};
```

Agree one app URL and supported fixture ID. Pass the small launch record using whatever the app already supports; default is an explicit Open app link with a URL fragment that the app validates. Do not put credentials, transcript text or model bytes in the URL. Unrecognized fields/modes fail visibly. Register the URL locally; model output cannot redirect to an arbitrary site.

The same deployed app may support two allowlisted configurations: v1 baseline and v2 non-color. Appstract stores their parent/version identities and capability delta. Call this a configuration extension. It does not prove code generation or immutable code releases. The external app shows supplied version/mode and computes the same sample through one canonical algorithm.

A newly registered prepared app must be labeled prepared/registered, not generated. If QM actually produces a new revision during the demo, retain the run and revision link as evidence. Approval of the brief authorizes that bounded work; do not add a generic release-review subsystem today.

## Result and return

The app displays its own result and offers a Back to Appstract link. Parent does not need to receive result payloads for the two-act demo. It can show “App opened” but must not infer “Run succeeded.” No iframe, postMessage handshake, callback backend or receipt export is required unless already working. If an existing return path exists, preserve app/version/request identities and validate it; don't build a new framework to anticipate it.

Baseline text remains accessible; v2 adds labels/shapes/non-color diagram encoding. Preserve same sample/rule/result identity when only presentation changes. Real-IFC claims require the app team's separate implementation evidence and are outside this baseline.

## Provider scope

QM: one existing scoped build/extension, if already reachable. GBrain: one explicit app-summary write and fresh-request lookup, if a dedicated connection already works. Ten-minute combined readiness budget. No provisioning, personal-brain mutation, generic adapters/outbox or new OAuth service setup today. Disconnected providers are visibly disconnected; local catalog reuse still works.

## Coordination check

Before the teams split, agree the URL, these field names, fixture ID, presentation meanings and return link. Then independently implement the parent UI and app result surface. The exact-repeat test and v1/v2 sample-invariance test are the shared acceptance checks. No edits were made to the sibling repository during this planning revision.
