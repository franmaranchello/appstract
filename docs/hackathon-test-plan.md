# Connected demo rehearsal

Start Appstract on 5174 and the clash app on 5186 (production previews: 4174 and 4186).

1. Reset demo. With QM configured, select histories → **Find patterns** → a discovered clash workflow. Without QM, choose **View prepared examples** → **Clash coordination**. Confirm **Existing app found**, with no connection or registration form.
2. **Open app**. The separate app opens v1 and computes six sample clashes. Confirm baseline presentation and **Back to Appstract**.
3. Return. Use Claudia’s color-blind example → **Find app** → **Extend app & open v2**. Confirm the same app opens v2 with labels, numbered shapes and hatching.
4. Return and repeat the request. Confirm reuse, two versions only, and Claudia’s request in the app history. Reopen v1 from version history; baseline presentation remains available.
5. Try the XML example. It asks for clarification instead of routing an unsupported file task to the sample geometry app.
6. Check narrow screens and keyboard navigation. Reset before the live presentation.

## Verified locally

- Both production builds; 15 parent domain/discovery tests and 67 generated-app tests.
- Browser journey through both running apps: discovery, v1, extension to v2, repeat reuse, persistence after return and v1 reopening.
- Same six clash pairs in both presentations; v2 adds non-color encoding.
- Appstract and generated app reflow at 320px without horizontal overflow.
- A simulated browser-storage failure blocks navigation and keeps versions in the parent; it cannot silently lose v2 on return.
- Skip links preserve the current route/version. XML requests show clarification.
- Manifest validation, failed requests and timeout behavior are covered by parent tests; malformed launch/version/return fields by generated-app tests.

Headless Chromium lacked WebGL, so visual browser checks used the plan fallback. Real GPU rendering was not re-verified. These earlier cross-app checks used prepared patterns. The QM history input now has importer, bridge and evidence-validation coverage; see the live bridge checks below. App extension remains configuration only; generated code and GBrain are not demonstrated.

## QM discovery checks

See [QM setup](qm-discovery.md). Verify Source: QM, saved analysis timestamps and source-matching user quotes; then return from the clash app and confirm the same selection reloads. Without the local bridge the UI must show QM not connected, disable Find patterns, and offer prepared examples explicitly.

## Live QM input bridge

Check `/api/discovery/status` reports QM with 80 sessions and 1,171 messages. Find patterns must show Source: QM, saved analysis timestamps and real quoted evidence. Source JSON must include `qmSessionId`. Stop the tunnel to confirm an explicit offline error, never silent prepared results. Keep the Mac awake during the demo.
