# Vendor approval app

Imported from [alexselig/bauhaus-vendor-approval](https://github.com/alexselig/bauhaus-vendor-approval)
at commit `8fbeca26a2632f9c7ca415fc5dc64a40e9a2c88e` (2026-09-27).
The original vendor workflow, sample data, components and behavior tests are retained.

Appstract bundles this app as a separate HTML entry at `/apps/vendor-approval/`.
Run `npm ci` and `npm run dev` from the repository root. No second server is needed.
`npm run build` includes both Appstract and this app; `npm test` runs both suites.

Integration changes:

- HashRouter keeps vendor routes refreshable on static hosting without SPA rewrites.
- The discovery manifest lives in `public/apps/vendor-approval/app-manifest.json`.
- Launch metadata is in the query string, leaving the fragment for vendor routes.
- A validated same-origin Back to Appstract link survives navigation and refresh.
- A persistent context bar identifies v1, Dana's pattern and the sample-data boundary.
- Tests use jsdom storage, with Node native Web Storage disabled in the test workers.

This is a fictional frontend demo. Research and document requests are simulated;
no vendor is contacted. Vendor data persists only in this browser, under the
upstream `bauhaus.vendor-demo.v1` key. Its Reset demo restores the 14 seeded
vendors independently of Appstract's request/version reset.

The prepared source pattern asks for a six-category scorecard. This app covers
intake, document requirements, security checks and human approval; it does not
import source questionnaires or generate that full scorecard. Integration is
curated, not runtime code generation.
