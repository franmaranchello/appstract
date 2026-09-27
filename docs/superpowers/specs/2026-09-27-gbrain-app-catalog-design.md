# GBrain App Catalog Integration Design

## Goal

Use GBrain as Appstract's durable app-memory and retrieval layer while keeping
Appstract responsible for executable app discovery, validation, versioning, and
launch.

## Architecture

The browser calls same-origin `/api/gbrain/*` endpoints provided by a small Vite
adapter. The adapter is loopback-only because Vite is already bound to
`127.0.0.1`; it invokes the local `gbrain` CLI without a shell.

App records are written as canonical Markdown pages under
`appstract/apps/<app-id>`. Each page starts with an `APPSTRACT_APP_RECORD_V1`
marker and a JSON record containing the stable app ID, supported task,
presentations, manifest URL, evidence references, and verification timestamp.

Search is advisory. Appstract searches GBrain for the request, extracts only
valid Appstract records, and accepts a result only when its `appId` matches the
currently discovered and validated local app. The existing deterministic router
continues to decide whether the request is reused, extended, or clarified.

## Components

- `server/gbrain.ts`: validation, Markdown serialization, CLI invocation,
  search-result parsing, and HTTP handlers.
- `src/gbrain.ts`: browser client and response validation.
- `vite.config.ts`: mounts the adapter in development and preview servers.
- `src/App.tsx`: remembers a discovered app, searches before routing a request,
  and displays provenance or explicit fallback status.

## Data Flow

1. Manifest discovery succeeds.
2. Appstract posts the app and clash-pattern evidence to
   `/api/gbrain/apps/remember`.
3. The adapter runs `gbrain put appstract/apps/<id> --json`, supplying the
   canonical Markdown page on stdin.
4. A teammate submits a request.
5. Appstract posts the request to `/api/gbrain/apps/search`.
6. The adapter runs `gbrain search "<request> appstract app catalog" --limit 5
   --json`.
7. Appstract accepts only a candidate matching the currently validated app ID,
   then runs the existing deterministic router.

## Failure Behavior

- Missing CLI, missing configuration, timeouts, non-zero exits, malformed JSON,
  and invalid responses return an explicit unavailable result.
- GBrain failure never blocks manifest discovery, local routing, version
  persistence, or app launch.
- The UI labels fallback behavior; it never presents a local match as a GBrain
  match.
- Requests and app records are length-bounded before process execution.
- The adapter uses `execFile`, not a shell, so request text cannot become shell
  syntax.

## Verification

- Unit tests cover page serialization, command arguments, valid search parsing,
  stale/foreign app IDs, malformed output, missing CLI, body limits, and method
  handling.
- Existing domain and discovery tests must remain green.
- The production build must pass.
- A fake `gbrain` executable provides an end-to-end adapter smoke test without
  requiring the user's real brain or writing personal data.

## Explicit Exclusions

No generated code, QM dispatch, authentication, remote multi-user registry,
automatic version creation, graph enrichment, or successful-run receipt is
added in this slice.
