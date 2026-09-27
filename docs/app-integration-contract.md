# Appstract app integration contract

Appstract automatically discovers the separately running clash app. It owns browser-local app/version/request history and routing. The separate repository owns the canonical sample, computation and result UI. There is no Connect or registration UI, backend registry, generated-code pipeline or result receipt protocol.

## Bundled vendor app

Vendor approval is imported from `alexselig/bauhaus-vendor-approval` at
`8fbeca26a2632f9c7ca415fc5dc64a40e9a2c88e`. It is a second Vite HTML entry under
`apps/vendor-approval/`, built and served with Appstract. It uses the same manifest
discovery and catalog history flow as clash detection, with its own identity:

```json
{
  "schemaVersion": 1,
  "appId": "appstract.vendor-approval",
  "name": "Vendor approval",
  "fixtureId": "sample-vendors",
  "baselineVersionId": "vendor-v1",
  "presentations": ["baseline"]
}
```

`discoverApp(kind, baseUrl, signal?)` validates each manifest against its expected
catalog entry. Discovery failures are independent: an offline clash app does not
prevent vendor discovery or launch. Saved versions and request events are scoped
to their app. Existing single-clash storage migrates without losing v1/v2 or requests.

The vendor app uses query parameters for the pinned launch contract, and
`#/vendors` for HashRouter navigation. Its Back to Appstract link accepts only
the same origin, root path and known parent fragments. Metadata persists across
vendor routes and refresh. No transcripts are passed.

Vendor review, intake, document, security and approval requests reuse `vendor-v1`.
Unsupported scorecard/import/live automation requests clarify. Clash's non-color
extension does not apply to vendor approval. Vendor records have their own local
storage and reset, independent of Appstract's catalog history.

Vendor discovery supports both the prepared example and live-QM patterns from
the `vendor-review` source whose titles identify intake, review, approval,
scorecards or due diligence. Generated QM pattern IDs and the older `other`
workflow label are supported; vendor negotiation and communication patterns do
not match. QM evidence is verified against live source conversations.
The imported app covers part of the source workflow: simulated intake, document/security
checks and human approval with sample vendors, not the full six-category scorecard.
No runtime app generation or external vendor communication is claimed.

## Clash discovery

Parent dev `:5174` uses child `:5186`; parent preview `:4174` uses child `:4186`, retaining the current loopback hostname and protocol. `VITE_CLASH_APP_URL` overrides this; `VITE_DEMO_APP_URL` is the legacy fallback. Addresses accept HTTPS or loopback HTTP, without URL credentials.

The child serves `app-manifest.json` from its app root (Vite source: `public/app-manifest.json`) and permits the parent's cross-origin fetch. The current validator requires exactly these fields and values; presentation order may vary:

```json
{
  "schemaVersion": 1,
  "appId": "appstract.clash-check",
  "name": "Clash detection",
  "fixtureId": "sample-building",
  "baselineVersionId": "clash-v1",
  "presentations": ["baseline", "non-color"]
}
```

`discoverClashApp(baseUrl, signal?)` fetches without cache or redirects, validates the manifest and uses its directory as the launch root. Invalid manifests, network failures, cancellation and a four-second timeout return named `AppDiscoveryError` failures. There is no fallback app creation. Retry checks the running app again.

`mergeDiscoveredApp` retains valid saved `clash-v1`/`clash-v2` records only for the canonical app ID, while updating the discovered address/name. Foreign or malformed versions do not carry over.

## Same-tab launch and return

Appstract uses `location.assign` with a URL fragment:

```ts
type DemoLaunch = {
  appId: 'appstract.clash-check';
  appVersionId: 'clash-v1' | 'clash-v2';
  sourceRequestId: string; // local request-version marker, not authenticated identity
  mode: 'sample';
  presentation: 'baseline' | 'non-color';
  fixtureId: 'sample-building';
  returnTo?: string; // validated HTTPS or loopback HTTP parent URL
};
```

The child reads `new URLSearchParams(location.hash.slice(1))`, validates supported values, selects the requested presentation and offers Back to Appstract using `returnTo`. The parent supplies its request-page fragment so the next teammate can continue. Transcript text, model files and credentials are not passed. The child must validate the return address before linking to it.

No iframe, new-tab bridge, `postMessage` handshake or callback backend is used. The parent records an open/reuse request; navigation alone is never a successful-run receipt.

## Reuse and extension

“Run clash detection” reuses the available version. A contextual request such as “I'm color-blind, can you make the same tool easier to read?” extends baseline `clash-v1` to `clash-v2`, preserving app identity and v1. The new version stores the request and optional `requestedBy` persona. Repeating the extension is idempotent; requesting accessible presentation again reuses v2.

Both versions use the same executable app with different supported presentation settings. This is a configuration extension, not proof of generated code or immutable code releases. The child must preserve canonical sample/rule/clash results while changing visual encoding. Baseline text remains accessible.

Unrelated finance/submittal requests and unsupported XML/IFC/issue-triage requests clarify rather than matching this app. Missing or offline discovery never authorizes automatic CREATE. Requesters and version history persist in this browser; persona switching is a simulation, not shared authentication.

## Verification boundary

The original fifteen clash domain/discovery tests cover strict manifests, offline/timeout/cancellation failures, v1 preservation, requester persistence, safe launch/return URLs and repeated-request reuse. Prior clash browser verification passed on both dev and production-preview ports: automatic discovery, v1 launch, second-teammate extension, v2 launch, repeat reuse, return persistence and reopening v1. Both presentations showed the same six sample clashes; the child has 67 passing tests. Headless visual checks used the plan fallback because WebGL was unavailable.

QM is connected as a synthetic history input through an authenticated live bridge. Appstract verifies saved model analysis against live QM conversations; prepared examples remain explicitly separate. See [QM history input](qm-discovery.md) for setup and limits. GBrain is not connected. Historical planning documents describe broader proposals, not current runtime guarantees.
