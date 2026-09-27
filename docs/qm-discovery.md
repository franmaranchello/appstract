# QM as a history input

QM is one input to Appstract. The demo imports the existing synthetic `chat-histories/json` corpus into a real local QM instance, reads it back through QM's portal API, and uses Appstract's local Codex analyzer to extract recurring workflows. QM is not the analysis engine.

## Current demo architecture

Browser → Vercel `/api/discovery/*` function → HTTPS tunnel → token-authenticated local bridge on port 5176 → QM portal on port 8129.

The Mac, Docker/QM, bridge and tunnel must stay running. QM itself is not hosted on Vercel. The tunnel is temporary; restarting it produces a new URL that must be saved in Vercel's `QM_BRIDGE_URL` environment variable and deployed. Secrets remain server-side. The bridge token is generated in `.context/qm-bridge-token` with mode 0600.

Only the explicitly seeded synthetic corpus is exposed. The bridge has no generic proxy, admin routes, chat-write routes or public model-run triggers. The Vercel endpoint is intentionally public for this synthetic demo; it is not suitable for private company chats without user authorization and tenant isolation.

## Local operation

The testing QM instance lives in `.context/qm-source`, uses a workspace-specific local Postgres database, org `appstract-test`, and principal `appstract-tester`. The instance was created from upstream commit `a5a36675041a85e30b9ff3632f678ba36837aabf`. Its operator details are in `.context/qm-instance.md`.

```bash
npm run qm:seed       # idempotent import, refuses changed existing transcripts
npm run qm:analyze    # read QM and save validated analysis; reuse unchanged inputs
npm run qm:bridge    # authenticated server on 127.0.0.1:5176
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:5176
```

The seeder uses QM's own Postgres session-store interface, verifies the local test instance and database, preserves original roles/content/timestamps as import metadata, and labels sessions `[Synthetic HRA]`. It imported **80 sessions / 1,171 messages / four personas**. Every imported turn was read back through QM's API and compared with the original corpus.

`server/qm-input.ts` reads only `appstract-synthetic:v1:` sessions with matching synthetic metadata. It paginates transcripts and excludes hidden prompts, tool/system entries and newly added private turns. The import is a fixed demo corpus, not automatic ingestion of every QM conversation.

The analyzer uses the installed Codex CLI and existing OAuth login in an ephemeral read-only process, without shell, web, apps or multi-agent tools. It treats transcript contents as untrusted data. Saved files and exact input fingerprints live under `.context/`; they are not deployed as static assets. Run the analyzer locally to refresh changed data. Concurrent analyzer runs are not supported.

## User experience and evidence

**Find patterns** reads the selected live QM histories, compares them with the saved analysis input, and verifies every evidence quote before returning results. The UI explicitly labels QM as the source and analysis as saved, with read/analysis timestamps. It does not imply a new model run on each click. While local analysis is still being prepared, the UI shows progress; public visitors cannot start model work.

Each pattern needs exact quotes from user turns in at least two distinct sessions. The server derives author, dates, session counts and QM session IDs from live input. Counts are cited sessions, not exhaustive frequency. Analysis is per person, not cross-person clustering. Changed inputs invalidate prior results. Offline QM/tunnel errors are explicit; prepared examples are a separate, labeled path.

Selection IDs encode allowlisted sources and an input fingerprint; they survive bridge/function restarts without an in-memory job map. Vercel requests are synchronous, bounded reads. No serverless background work runs after a 202 response.

The existing child-app manifest discovery and v1/v2 configuration flow remains separate. A clash topic label is not proof that the sample app supports XML or IFC. Version 2 remains a configuration extension rather than generated code.

## Verification

Tests cover source pagination/private-turn exclusion, origin restrictions, token authentication, route/body limits, restart-safe selection, changed-input rejection, exact citations, and existing domain/registry behavior. Live verification checks the real QM corpus, authenticated tunnel, deployed Vercel endpoints and browser discovery. See `.context/qm-live-verification.json` for the latest deployment receipt when present.

This is a temporary live demo bridge. Durable hosting, per-user access, continuous ingestion and automatic analysis refresh remain future work.
