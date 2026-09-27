# GBrain App Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real, fail-open GBrain save/search path to Appstract's existing app-discovery flow.

**Architecture:** A loopback-only Vite adapter invokes the local `gbrain` CLI with `execFile`. Appstract writes canonical app pages, searches them for teammate requests, validates returned IDs against the live manifest registry, and falls back explicitly to its deterministic local router.

**Tech Stack:** TypeScript, React 19, Vite 8, Node test runner, Node `child_process`.

## Global Constraints

- Keep Appstract as the executable app registry and source of truth.
- Treat every GBrain result as advisory until its `appId` matches a live validated manifest.
- Never invoke the CLI through a shell.
- Never make GBrain availability a prerequisite for existing Appstract behavior.
- Do not add runtime dependencies.

---

### Task 1: Server-side GBrain adapter

**Files:**
- Create: `server/gbrain.ts`
- Create: `server/gbrain.test.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Produces: `createGBrainMiddleware(options?)`, `rememberApp(record, runner?)`, and `searchApps(query, runner?)`.
- CLI contract: `gbrain put <slug> --json` with Markdown on stdin; `gbrain search <query> --limit 5 --json`.

- [ ] **Step 1: Write failing tests**

Cover canonical page serialization, safe argument arrays, parsed candidates,
foreign records, malformed JSON, missing CLI, request method validation, and
oversized bodies.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`

Expected: failure because `server/gbrain.ts` does not exist.

- [ ] **Step 3: Implement the adapter**

Use `execFile("gbrain", args, { timeout: 5000, maxBuffer: 1_000_000 })`.
Serialize records with an `APPSTRACT_APP_RECORD_V1` marker followed immediately
by JSON. Parse only slugs under `appstract/apps/`, validate all returned fields,
and convert process failures into `{ available: false, error }`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: all adapter and existing tests pass.

### Task 2: Browser client and Vite wiring

**Files:**
- Create: `src/gbrain.ts`
- Create: `src/gbrain.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: `rememberAppInGBrain(app, pattern, signal?)` and
  `findAppsInGBrain(request, signal?)`.
- Consumes: `/api/gbrain/apps/remember` and `/api/gbrain/apps/search`.

- [ ] **Step 1: Write failing client tests**

Mock `fetch` and verify successful responses, unavailable responses, abort
propagation, and malformed server payload rejection.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`

Expected: failure because `src/gbrain.ts` does not exist.

- [ ] **Step 3: Implement client and middleware wiring**

Mount the same handler through Vite's `configureServer` and
`configurePreviewServer`. Use same-origin relative URLs and JSON request bodies.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: all tests pass.

### Task 3: App flow and provenance UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `rememberAppInGBrain` and `findAppsInGBrain`.
- Preserves: `routeRequest(request, app)` as the final routing decision.

- [ ] **Step 1: Add GBrain state**

Track `idle`, `remembering`, `ready`, `searching`, and `unavailable`, plus the
matched page slug and error message.

- [ ] **Step 2: Remember validated discoveries**

After manifest discovery succeeds, send the app plus the selected clash-pattern
evidence to GBrain. Failure sets unavailable status without changing the app.

- [ ] **Step 3: Search before deterministic routing**

On **Find app**, search GBrain first. Mark provenance only if a returned candidate
matches the current app ID; always run `routeRequest` to enforce capability and
extension rules.

- [ ] **Step 4: Render provenance and fallback**

Show **Found through GBrain** and the page slug for a validated match. Otherwise
show **Local catalog fallback** with the reason GBrain was unavailable or did
not return the live app.

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and Vite produces `dist/`.

### Task 4: Documentation and end-to-end adapter smoke test

**Files:**
- Modify: `README.md`
- Modify: `docs/app-integration-contract.md`

**Interfaces:**
- Documents: local GBrain prerequisite, exact boundary, fallback behavior, and
  commands.

- [ ] **Step 1: Update documentation**

Document that `npm run dev` and `npm run preview` expose the loopback adapter,
that GBrain is optional, and that matches are revalidated against the manifest.

- [ ] **Step 2: Run a fake-CLI smoke test**

Put a temporary executable named `gbrain` first on `PATH`; make `put` consume
stdin and make `search --json` return one canonical Appstract result. Start Vite,
POST to both endpoints, and verify the remembered slug and returned `appId`.

- [ ] **Step 3: Final verification**

Run: `npm test && npm run build`

Expected: all tests pass and build succeeds.
