# Appstract Hackathon Video Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a four-slide, video-ready PowerPoint deck that explains Appstract's pattern-to-tool concept in approximately 60-75 seconds.

**Architecture:** A single PptxGenJS source script creates all editable slide elements from shared Modul tokens and small layout helpers. A separate narration Markdown file supplies the video voiceover. The generated deck is rendered to images and visually inspected before delivery.

**Tech Stack:** Node.js, PptxGenJS, PowerPoint `.pptx`, repository-local Modul design tokens.

## Global Constraints

- Use four 16:9 slides.
- Use the exact story and copy constraints in `docs/superpowers/specs/2026-09-27-appstract-hackathon-video-slides-design.md`.
- Use Appstract's Modul colors, typography, square geometry, and flat visual language from `DESIGN.md`.
- Keep supporting text at least 24 pt and diagram labels at least 28 pt.
- Use only editable PowerPoint text and shapes.
- Do not imply live pattern discovery or arbitrary app generation in the current prototype.
- Do not overwrite a previously generated deck; increment the output filename if necessary.

---

### Task 1: Build the editable slide deck

**Files:**
- Create: `slides/build-hackathon-concept-deck.mjs`
- Create: `slides/appstract-hackathon-concept.pptx`

**Interfaces:**
- Consumes: Modul colors and story requirements from `DESIGN.md` and the design specification.
- Produces: a deterministic 16:9 PowerPoint deck with four slides and editable shapes.

- [ ] **Step 1: Create shared presentation tokens and helpers**

Define slide dimensions, font families, colors, headline placement, footer treatment, arrows, and bordered blocks in `slides/build-hackathon-concept-deck.mjs`.

- [ ] **Step 2: Implement slide 1**

Create three visibly repetitive request-to-LLM-to-output rows under the headline `STOP STARTING FROM ZERO`, with the repeated work emphasized and no dense explanatory paragraph.

- [ ] **Step 3: Implement slide 2**

Create a single large `INPUT → REPEATED ACTIONS → OUTPUT` flow using the concrete clash-coordination example.

- [ ] **Step 4: Implement slide 3**

Create the central tool block and route three future requests to `REUSE`, `EXTEND`, and `CREATE`, visually favoring reuse and extension.

- [ ] **Step 5: Implement slide 4**

Create a small versioned tool library, route a new request through it, and end on `START WITH WHAT ALREADY WORKS`.

- [ ] **Step 6: Generate the deck**

Run:

```bash
node slides/build-hackathon-concept-deck.mjs
```

Expected: a new `.pptx` output path is printed and the file exists with four slides.

### Task 2: Add concise narration

**Files:**
- Create: `slides/appstract-hackathon-concept-narration.md`

**Interfaces:**
- Consumes: the four-slide deck story.
- Produces: one 10-15 second narration segment per slide, totaling approximately 60-75 seconds.

- [ ] **Step 1: Write narration**

Write one plain-language paragraph per slide. Avoid product jargon and describe the on-screen transition rather than reading every label.

- [ ] **Step 2: Check spoken length**

Count the narration words. Expected: approximately 130-170 words total.

### Task 3: Validate the deliverable

**Files:**
- Inspect: generated `.pptx`
- Create: rendered slide images in a temporary validation directory

**Interfaces:**
- Consumes: generated deck.
- Produces: evidence that all four slides render cleanly and meet the visual constraints.

- [ ] **Step 1: Render all slides**

Use the available PowerPoint rendering tooling to create one image per slide without opening the deck interactively.

- [ ] **Step 2: Inspect the montage**

Confirm no clipping, overlap, tiny text, low contrast, or inconsistent spacing. Confirm that the four-step story remains understandable from the montage alone.

- [ ] **Step 3: Run presentation validation**

Confirm the file is a valid PowerPoint package, contains exactly four slides, and has no off-slide content or reported overflow.

- [ ] **Step 4: Fix and regenerate**

If any validation fails, update the source script, generate a new versioned output, and repeat rendering and inspection.

- [ ] **Step 5: Commit source and documentation**

```bash
git add docs/superpowers slides
git commit -m "feat: add Appstract hackathon concept slides" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" \
  -m "Copilot-Session: 347a9b10-21fb-4b93-b598-910830c5369b"
```
