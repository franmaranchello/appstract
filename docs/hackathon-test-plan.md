# Connected demo rehearsal

Start Appstract on 5173 and the clash app on 5186 (production previews: 4173 and 4186).

1. Reset demo. Select histories → **Find patterns** → **Clash coordination**. Confirm **Existing app found**, with no connection or registration form.
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

Headless Chromium lacked WebGL, so visual browser checks used the plan fallback. Real GPU rendering was not re-verified. This is a prepared sample/configuration demo; it does not demonstrate generated code, live model inference, QM or GBrain integration.
