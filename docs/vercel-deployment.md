# Vercel deployment

The current main branch is a static Vite/React demo. `vercel.json` installs with
`npm ci`, builds with `npm run build`, and serves `dist`. Use Vercel's Node 24.x
runtime. Navigation uses URL fragments, so no catch-all SPA rewrite is needed.
In particular, missing `/api/*` and child-app paths must not return parent HTML.

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

## QM work in progress

Boston owns the QM discovery integration. Its current implementation uses Vite
development/preview middleware, a process-local job map, background work after
a 202 response, and a loopback-only access check. `vite build` does not deploy
that middleware. Copying it into a Vercel Function would not make its job state
or execution lifetime durable, and removing the loopback check would expose the
configured QM actor without replacing its access control.

Keep this static demo and local QM verification distinct until the QM owner
provides a hosted adapter. A persistent authenticated service beside QM can
own the jobs, or a Vercel implementation can use durable job storage and
execution. Either needs real user authorization, job ownership, bounded
execution, and a verified HTTPS QM endpoint. A same-origin API can then be
routed to that adapter; no backend route is configured in this static setup.

`QM_CORE_URL`, `QM_SIGNING_SECRET`, `QM_ACTOR_ID`, `QM_MODEL`, and `QM_HARNESS`
belong only on the server executing the QM adapter. Never use a `VITE_` prefix
for those values or embed them in browser code. Setting them on a static Vercel
project alone does not enable QM. Preserve explicit disconnected/error states
when integrating Boston's UI; prepared examples must remain labeled examples.

## Agent setup

Follow [Vercel's agent setup guide](https://vercel.com/get-started.md) for the
global CLI, user-scoped Vercel plugin, and shared OAuth MCP endpoint
`https://mcp.vercel.com`. Codex configuration lives in `~/.codex/config.toml`.
OAuth completion, authenticated MCP checks, project linkage, preview deployment,
and live two-app/QM verification are separate checks.

## Verified setup on 2026-09-27

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
