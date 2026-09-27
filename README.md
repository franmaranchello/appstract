# Appstract

Interactive Modul mockup for finding recurring organizational work and reusing a teammate's app.

## Run

Use Node 22.12+ (built here with Node 26.3.1).

```bash
npm ci
npm run dev
```

Appstract runs at `http://127.0.0.1:5173`. Start the separate clash app on port **5186**; Appstract discovers its manifest automatically. There is no Connect or registration step. For production previews, Appstract uses **4173** and expects the clash app on **4186**. Ports are fixed; an occupied parent port produces an error.

```bash
npm test
npm run build
npm run preview
```

### Optional GBrain app memory

When the `gbrain` CLI is installed and configured, the Vite development and
preview servers expose a loopback-only adapter at `/api/gbrain/apps/*`.
Appstract then:

1. saves the validated clash app as
   `appstract/apps/appstract-clash-check`;
2. searches GBrain when a teammate submits a request; and
3. accepts the result only if its `appId` matches the currently validated app
   manifest.

Install and initialize GBrain using its official instructions, then start
Appstract normally. No browser credentials or API keys are required by
Appstract; the server invokes the user's local CLI with its existing
configuration.

If GBrain is missing, unconfigured or returns an invalid result, Appstract
shows **Local catalog fallback** and keeps the existing deterministic flow.
GBrain is a memory and discovery layer, not proof that an app exists or ran
successfully.

For a different app address, copy `.env.example` to `.env.local` and set `VITE_CLASH_APP_URL`, then restart Vite. The legacy `VITE_DEMO_APP_URL` remains a fallback. These are public app addresses, never secrets. Cross-origin manifest requests must be allowed by the clash app's server.

![Appstract history view](docs/mockup-history.png)

[Pattern selection and automatic app discovery](docs/mockup-patterns.png)

## Try the two-person flow

1. Select histories → **Find patterns** → select **Clash coordination**. Appstract checks the running app and shows **Existing app found** beside the source evidence.
2. Click **Open app** to run v1. Navigation stays in the same tab and passes the pinned version to the separate app.
3. Use the app's **Back to Appstract** link. Choose another teammate and ask: “I'm color-blind. Can you make the same tool easier to read?”
4. **Find app** → **Extend app & open v2**. The same app opens with labels, shapes and non-color markers.
5. Return to inspect both versions and requester history. Repeat the request to reuse v2; reopen v1 from version history. Refresh retains browser-local state.

If the app is offline or its manifest is invalid, discovery shows an error and Retry. It does not create a replacement app. Rediscovery updates the address while preserving valid saved versions and their requester. Reset clears this browser's demo state; the running app can be discovered again.

## What this proves

Four prepared opportunities use exact excerpts from the supplied synthetic HRA corpus. Analysis is manually curated and routing uses deterministic rules. Version 2 is an allowlisted **configuration extension**, not newly generated code. Persona selection simulates teammates; it is not authentication.

The separate app owns sample geometry, computation and result UI. Appstract owns discovery, request routing and browser-local version/request history. Opening it does not prove a successful computation. The optional GBrain integration performs a real local write/search round trip when configured; no live model or QM integration runs here.

## Main files

| File | Responsibility |
|---|---|
| `src/App.tsx` | Views, requests and local persistence |
| `src/registry.ts` | Manifest discovery, errors and saved-version reconciliation |
| `src/gbrain.ts` | Browser client for optional GBrain app memory |
| `server/gbrain.ts` | Loopback adapter that safely invokes the local GBrain CLI |
| `src/domain.ts` | Routing, versions, validation and launch URLs |
| `src/data.ts` | Prepared patterns and original source excerpts |
| `src/styles.css` | Modul styling and responsive layout |
| `chat-histories/json/` | Supplied synthetic conversations |

Fonts and histories are bundled locally. The bundled corpus produces a large-chunk build warning.

## References and verification

- [App integration contract](docs/app-integration-contract.md)
- [Build plan](docs/hackathon-plan.md)
- [Modul design system](DESIGN.md)
- [Rehearsal checklist](docs/hackathon-test-plan.md)
- [Deferred work](TODOS.md)

The 15 domain/discovery tests and production build pass. Browser-verified across both running apps: automatic discovery → v1 → second teammate request → v2, repeat reuse, saved versions after return, reopening v1, incompatible XML requests, storage failure, and 320px layouts. The generated app has 67 passing tests. Headless browser verification used the plan fallback because WebGL was unavailable.

![Same app with v1 and v2](docs/mockup-apps.png)
