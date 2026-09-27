# Vercel deployment

## Current hosted demo

- Parent: <https://appstract-nine.vercel.app> (`radical-labs/appstract`).
- Clash app: <https://appstract-clash-detection.vercel.app>
  (`radical-labs/appstract-clash-detection`).
- Parent production `VITE_CLASH_APP_URL` points to the clash app above; child
  production `VITE_APPSTRACT_URL` points to the parent above. Both are public
  build configuration stored in Vercel, and both builds have been deployed.
- The child manifest allows the parent origin via its checked-in Vercel CORS
  header. Use the canonical parent URL above for the paired demo.

On 2026-09-27, the live pair passed a visible-browser check with actual 3D
rendering: automatic discovery, v1 with six sample clashes, Back to Appstract,
Claudia's labels-and-shapes v2, refresh persistence, repeating the extension
reusing v2 without v3, and reopening v1. Both versions produced the same six
pairs and model fingerprint. Pair isolation also worked. The child has 67
passing tests; both GitHub checks passed before its deployment configuration
was merged in bauhaus-clash-detection PR #3.

Verified deployments: parent `dpl_FsUUmq9n7BbjdpTX6TLKnWCHaJ2m` from main
`2a221a8`, child `dpl_BXqz5Y4qKQPvX582vFiZkgbKSzKV` from `ae53797` (merged
as `9a44b13`). Later main-branch changes require their own deployment and
verification. These earlier checks used the prepared pattern demo and
deterministic sample detector. QM is now provisioned and connected as described below.

The frontend is a static Vite/React demo with explicit Vercel API functions
under `api/discovery/` for the QM bridge. `vercel.json` installs with
`npm ci`, builds with `npm run build`, and serves `dist`. Use Vercel's Node 24.x
runtime. Navigation uses URL fragments, so no catch-all SPA rewrite is needed.
The vendor integration adds a bundled HTML entry at `/apps/vendor-approval/`
and its manifest at `/apps/vendor-approval/app-manifest.json`. `npm run build`
emits both into `dist`; the existing install/build/output settings need no changes.
Vendor routes use hashes, so refresh stays on the child HTML entry. This addition
has been verified locally with 48 passing tests (32 parent and 16 vendor);
the hosted deployment snapshots above predate it.
In particular, missing `/api/*` and unbundled child-app paths must not return parent HTML.

## Link and preview

After authenticating with `vercel login`, check `vercel whoami` and `vercel teams
ls`. From the intended, reviewed checkout:

```sh
vercel link
vercel env add VITE_CLASH_APP_URL preview
vercel deploy
```

Select the intended account/team and link or create the `appstract` project.
Use the hosted child app's HTTPS root for `VITE_CLASH_APP_URL`. It is public
build-time configuration, not a secret. Redeploy when it changes. Repeat the
environment configuration for production before an approved production deploy.
Keep the `.vercel` link local; a different worktree can link to the same project.
The CLI deploys the current working tree, including uncommitted files, so do not
deploy another agent's unfinished checkout.

For an established project, `vercel deploy` creates a preview and
`vercel deploy --prod` publishes production. Inspect the returned target: on
2026-09-27, Vercel promoted this project's first deployment to production even
though the CLI was invoked with `--target preview`.
Connecting GitHub can enable automatic deployments; coordinate that separately
so merging the QM branch does not unexpectedly publish an incomplete backend.

## Separate clash app

Deploy `franmaranchello/bauhaus-clash-detection` separately. Its hosted build
needs `VITE_APPSTRACT_URL` set to the parent HTTPS origin so its validated Back
to Appstract link works. The child must serve `/app-manifest.json` with CORS
allowing the parent origin. Vite's development-server CORS configuration does
not configure Vercel's static responses. Configure this response in the child
deployment, and ensure deployment protection permits the parent's browser to
fetch the manifest.

Use stable parent and child domains for the paired demo. Preview URLs need their
own child return-origin/CORS configuration; do not assume a production pairing
also accepts arbitrary previews. If the child URL is unset, Appstract looks for
`/apps/clash-detection/` on its own origin; this repository does not contain that
app. A parent-only deploy does not prove the two-app demo works.

Verify the live manifest, discovery, v1 launch, return, second-person v2
extension, return, refresh persistence, and reopening v1 before declaring the
hosted demo complete.

## Live QM input bridge

QM runs locally on the demo Mac. It holds 80 synthetic conversations with
1,171 messages imported from `chat-histories`. Appstract-local analysis produced
23 patterns; the deployed app verifies saved input fingerprints and exact quotes
against live QM API reads before returning results. QM is the history input,
not the analysis engine. Public visitors cannot start model work.

The public Vercel functions proxy only status, source-history and saved-result
selection requests through a token-authenticated HTTPS tunnel to the local
bridge. `QM_BRIDGE_URL` and `QM_BRIDGE_TOKEN` are server-only production
environment variables. Never use a `VITE_` prefix. The bridge has no generic
QM proxy, admin access or chat-write endpoints. Only the seeded synthetic corpus
is public; private histories would require per-user authorization and isolation.

Use the explicit `status.js`, `jobs.js`, `jobs/[id].js`, and `history/[id].js`
function routes. This Vite deployment does not support Next.js-style nested
catch-all routing. Each request performs bounded reads; no background job runs
after a serverless response. Selections survive process restarts through source
IDs and input fingerprints, and changed inputs invalidate saved results.

The Mac, Docker/QM, local bridge and tunnel must remain running. Restarting the
quick tunnel changes its URL; update `QM_BRIDGE_URL` and deploy again. QM is not
hosted on Vercel. See [QM setup and demo limits](qm-discovery.md) for local commands.

Verified production deployment: `https://appstract-5j2bela5k-radical-labs.vercel.app`,
aliased to the canonical parent URL. Live status, all-source result selection,
restored selection and source-history reads returned 200. Browser verification
showed 23 patterns, live source JSON, and the existing child app launch/return.
The 23 domain, registry, input and bridge tests passed, as did the production build.
The bridge and local model caches stay outside Git and Vercel uploads.

## Agent setup

Follow [Vercel's agent setup guide](https://vercel.com/get-started.md) for the
global CLI, user-scoped Vercel plugin, and shared OAuth MCP endpoint
`https://mcp.vercel.com`. Codex configuration lives in `~/.codex/config.toml`.
OAuth completion, authenticated MCP checks, project linkage, preview deployment,
and live two-app/QM verification are separate checks.

## Initial setup on 2026-09-27 (before child deployment)

- Account: `franmaranchello`; team: `radical-labs`; project: `appstract`.
- CLI 60.1.3 authenticated. Shared Vercel MCP OAuth succeeded; both
  `search_vercel_documentation` and authenticated `list_teams` succeeded in a
  fresh Codex session. The user-scoped Vercel plugin is installed and enabled,
  but its skills were not visible in that session. Plugin loading remains to
  be verified after refreshing/restarting the client.
- Site: <https://appstract-nine.vercel.app>.
- Deployment: `dpl_5TrNirtpS15XnFhPV5VKzEvxNX3C`, Ready, production target.
- Source: main `b79766f` plus Calgary's deployment configuration. Boston's QM
  changes are excluded. The build and all 15 domain/discovery tests pass.
- Clash child hosting and live QM are not configured. No GitHub automatic
  deployment connection was enabled.
- Live browser check: history loads and Find patterns opens the labeled
  prepared analysis. Scripts, styles and fonts return 200. The missing child
  manifest returns 404 and the UI shows the expected unavailable/retry state.
  `/api/discovery/status` also returns 404, rather than parent HTML.
