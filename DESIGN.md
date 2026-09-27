# Appstract design system: Modul

User-selected source of truth: [Modul artifact](https://claude.ai/code/artifact/2947c1af-00c7-41bd-9f6a-de0de924d57f), inspected 2026-09-27 in the browser: Overview/README, tokens.json, component bundle.css and component previews. This replaces the earlier provisional teal/Source Sans direction. The artifact's editor chrome is not the design system; use its tokens and previewed components.

## Principles and product application

Use strong geometric uppercase display type, a visible hairline grid, generous white paper and flat primary-color fields. Appstract remains the brand; Modul names the system. Use text branding, no invented logo, gradients, soft tinted badges, pill buttons or elevation shadows. Square corners everywhere except true circles and the source's 2px checkbox/progress exception. Decorative illustrations are flat elevations; never pass the supplied collision illustration off as a computed result.

App UI flow: `01 HISTORY → 02 PATTERNS → 03 APPS`, with a persistent NEW REQUEST action. Number the main sections with two digits. Main view headings use Jost display-m on desktop, headline on mobile; avoid a giant marketing hero above every app detail. In-cell task titles use sentence case; navigation, headings and controls use uppercase; running body text stays sentence case. Use short factual copy, with ampersands in display lines and “and” in prose.

## Color tokens

Values transcribed from the source token inspector. Light is the demo default; preserve dark token values for compatibility, but a theme toggle is not new hackathon scope.

| Token | Light | Dark |
|---|---|---|
| paper | #FFFFFF | #111111 |
| paper-alt | #F5F5F3 | #1A1A1A |
| ink | #141414 | #F2F1ED |
| ink-muted | #5E5E5E | #A6A6A6 |
| rule | #E4E4E4 | #2C2C2C |
| rule-strong | #141414 | #F2F1ED |
| blue / link | #1F63F5 | #4F86FF |
| on-blue | #FFFFFF | #111111 |
| red | #EF3E36 | #FF5D52 |
| on-red | #141414 | #111111 |
| yellow | #FDB52A | #FFC445 |
| on-yellow | #141414 | #111111 |
| red-deep | #C42820 | #FF7A70 |

Blue leads primary actions, links and progress. Red is a single accent block with dark text; errors on paper use red-deep plus explicit wording. Yellow is a small marker, never body text or a large background. The area hierarchy is blue ≥ red > yellow; avoid repeating colorful badges across every row. Use rule for decorative divisions and rule-strong for meaningful control borders. Token contrast claims are not a substitute for testing the implemented pairings.

## Type tokens

| Style | Family | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| display-xl | Jost | 120 / 108px | 800 | -0.03em |
| display-l | Jost | 88 / 84px | 800 | -0.025em |
| display-m | Jost | 64 / 64px | 800 | -0.02em |
| headline | Jost | 44 / 48px | 800 | -0.015em |
| title | Jost | 32 / 36px | 700 | -0.01em |
| subtitle | Jost | 24 / 30px | 700 | -0.005em |
| heading | Jost | 18 / 24px | 800 | 0.02em |
| label | Jost | 12 / 16px | 600 | 0.14em |
| index | Jost | 16 / 20px | 500 | 0.04em |
| lead | Archivo | 20 / 30px | 400 | normal |
| body | Archivo | 15 / 24px | 400 | normal |
| body-strong | Archivo | 15 / 24px | 600 | normal |
| caption | Archivo | 13 / 20px | 400 | normal |
| code | IBM Plex Mono | 13 / 20px | 400 | normal |

Preserve the source's 15px body token; this explicit user-selected system takes precedence over the generic skill preference for 16px. Keep zoom/reflow functional and never shrink text to force content into cells. Body measure is 45–65 characters. Pair type sizes at least two steps apart where composing a heading/body hierarchy. The source declares Google Fonts but contains no uploaded font files; bundle the required fonts or verify loading before the demo, with the source fallback stacks as resilience.

## Grid, spacing, shape and focus

- Spacing: space-1…9 = 4, 8, 16, 24, 32, 48, 64, 96, 192px.
- Desktop 12 columns, mobile 4; desktop cell padding 32px, mobile 24px. Use the 96px module for major composition blocks. Responsive tracks may shrink/wrap; never enforce a fixed 1152px canvas on mobile.
- NavBar: 64px high, a row of cells. Use product navigation and a functional New request action; do not copy unused MENU/SEARCH controls merely as decoration.
- Controls: 48px high, square, label typography. Primary blue/on-blue; secondary strong 1px border; hover changes to an ink-filled control with paper text; ghost uses text and a line arrow.
- Stroke: hairline 1px; rule 2px; heavy 4px. Progress: 2px track, 4px blue fill. If no measured completion fraction exists, show an indeterminate stage label rather than a fabricated percentage.
- Focus-ring light: `0 0 0 2px #ffffff, 0 0 0 4px #1f63f5`; dark: `0 0 0 2px #111111, 0 0 0 4px #4f86ff`.
- Icons: 16px line icons, 1.5px strokes and square caps. Their interactive targets remain at least 44px; no icon-only meaning without a name.

## Component reuse and adaptation

Reuse the visual patterns of Button, NavBar, Pager, Progress and SectionTitle. The artifact exposes bundle.js, bundle.css and index.d.ts; no React compatibility or build setup has been verified. Port tokens/styles into the selected app stack and preserve native semantics; do not load the artifact bundle as trusted application code without reviewing it.

Source CSS has a NavBar `box-shadow: inset var(--focus-ring)` rule. Because focus-ring expands to two comma-separated shadows, only one receives `inset`; verify the rendered focus or use the explicit tested focus style on every nav key. This is a review observation, not proof of a runtime defect in the source artifact. Add `prefers-reduced-motion` support to the ghost-arrow translation. Disabled controls must remain clearly labeled, with the reason available beside them.

## Current hackathon views

**History:** APPSTRACT text identity; 01 HISTORY; dataset picker and source summary in ruled cells; ANALYZE HISTORY primary and VIEW JSON secondary. Show synthetic data and prepared/live analysis labels.

**Patterns:** 02 PATTERNS; desktop 7/5 split for ranked suggestions and source evidence. Counts support the task rather than becoming separate cards. Selected row uses a strong outline, not a tinted pill. REVIEW APP BRIEF follows the evidence. Keep the original triage recommendation visible when choosing the team-selected sample clash demo scope. Batch is deferred under the deadline.

**Apps:** 03 APPS; purpose, compact V1/V2 identity, capability change, evidence and OPEN APP. Preserve v1 access when a v2 attempt fails. The sample fixture, computation and result surface live in the separate app repo. Appstract links to that app; it does not draw its own clash result. Label prepared/registered, generated and configuration extension accurately.

**New request:** visible organization/persona, labeled composer, matched app and plain capability delta. Exact support reuses; a non-color presentation request creates/selects a configuration version. Preserve entered text on errors. Blue remains the action color; red/yellow are not unexplained confidence scores.

## External app and states

OPEN APP announces a new tab. Use the minimal handoff in docs/app-integration-contract.md. Parent may show opened; it cannot claim run success without evidence. A failed link/provider remains an error. No new receipt protocol, connection dashboard, release-review workflow or provider-management UI today.

Keep the catalog horizontal: evidence-backed opportunities across multiple categories, with one working app path. Show one requester when only one person's sessions support a pattern. No synthetic ROI.

## Accessibility and narrow navigation

Color never carries status alone. The external app owns stable pair IDs, readable baseline text and v2 shapes/labels. Parent controls have names, visible focus and truthful state labels. Target body contrast ≥4.5:1 and meaningful control edges ≥3:1. Preserve headings, keyboard navigation, focus restoration and 200% zoom.

Below768px, use a compact64px row for APPSTRACT/current section/menu, then a separate full-width48px NEW REQUEST button. Menu lists HISTORY, PATTERNS and APPS in keyboard order and restores focus on close. At320px/200% zoom let the header grow instead of clipping.

Check long task names and missing font fallback. Distinguish sample/live/recorded with words. No theme toggle, asset gallery, new design exploration or marketing landing page in the remaining90-minute scope.
