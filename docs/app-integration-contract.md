# Appstract ↔ clash app: implemented mockup contract

Appstract automatically discovers the separately running clash app. It owns browser-local app/version/request history and routing. The separate repository owns the canonical sample, computation and result UI. There is no Connect or registration UI, backend registry, generated-code pipeline or result receipt protocol.

## Discovery

Parent dev `:5173` uses child `:5186`; parent preview `:4173` uses child `:4186`, retaining the current loopback hostname and protocol. `VITE_CLASH_APP_URL` overrides this; `VITE_DEMO_APP_URL` is the legacy fallback. Addresses accept HTTPS or loopback HTTP, without URL credentials.

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

Unrelated finance/vendor/submittal requests and unsupported XML/IFC/issue-triage requests clarify rather than matching this app. Missing or offline discovery never authorizes automatic CREATE. Requesters and version history persist in this browser; persona switching is a simulation, not shared authentication.

## Verification boundary

Fifteen domain/discovery tests pass, including strict manifests, offline/timeout/cancellation failures, v1 preservation, requester persistence, safe launch/return URLs and repeated-request reuse. Cross-app browser verification passed on both dev and production-preview ports: automatic discovery, v1 launch, second-teammate extension, v2 launch, repeat reuse, return persistence and reopening v1. Both presentations showed the same six sample clashes; the child has 67 passing tests. Headless visual checks used the plan fallback because WebGL was unavailable.

QM, GBrain and live discovery from conversations are not connected. Opportunity cards remain prepared analysis of the checked-in synthetic corpus. Historical planning documents describe broader proposals, not current runtime guarantees.
