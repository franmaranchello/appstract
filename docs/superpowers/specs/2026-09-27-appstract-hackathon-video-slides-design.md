# Appstract Hackathon Video Slides Design

## Purpose

Create a short, video-ready PowerPoint sequence that makes the Appstract idea understandable in seconds. The slides explain why repeated direct-to-LLM requests are wasteful, how repeated inputs/actions/outputs reveal stable patterns, how those patterns become reusable tools, and how a versioned tool knowledge base improves future requests.

## Audience and timing

- Audience: hackathon judges and viewers with no prior Appstract context.
- Runtime: approximately 60-75 seconds.
- Format: four 16:9 slides, designed to remain legible in a compressed video.
- Each slide communicates one idea in roughly 10-15 seconds.

## Story

### Slide 1 — Stop starting from zero

Headline: `STOP STARTING FROM ZERO`

Show three similar requests going independently to an LLM and producing three disconnected outputs. The repetition should be visually obvious before the viewer reads any supporting text.

Core message: organizations repeatedly reconstruct the same workflow from scratch.

### Slide 2 — Repetition reveals a pattern

Headline: `REPETITION REVEALS A PATTERN`

Collapse the three requests into one stable horizontal flow:

`INPUT → REPEATED ACTIONS → OUTPUT`

Use a concrete example:

`Raw export → Group · Prioritize · Assign → Issue report`

Core message: the durable value is not an individual prompt; it is the recurring transformation between inputs and outputs.

### Slide 3 — Turn the pattern into a tool

Headline: `TURN THE PATTERN INTO A TOOL`

Transform the stable flow into one prominent tool block. Show future requests routing to three explicit actions:

- `REUSE` when the tool already supports the request.
- `EXTEND` when the workflow is right but the capability or output needs modification.
- `CREATE` only when no suitable tool exists.

Core message: Appstract preserves proven work and avoids unnecessary regeneration.

### Slide 4 — Your tool knowledge base compounds

Headline: `YOUR TOOL KNOWLEDGE BASE COMPOUNDS`

Show a small library of concrete tools such as `Clash coordination`, `Monthly close pack`, and `Vendor review`. A new request enters the library, selects or modifies an existing tool, and produces a repeatable output automation.

Closing line: `START WITH WHAT ALREADY WORKS`

Core message: users own a modifiable, versioned knowledge base of tools and output automations for future requests.

## Visual system

Use Appstract's Modul design system from `DESIGN.md`:

- White paper background `#FFFFFF`.
- Ink `#141414`.
- Primary blue `#1F63F5`.
- Red `#EF3E36` and yellow `#FDB52A` only as restrained secondary accents.
- Jost for display text and Archivo for supporting text.
- Square corners, flat color, one-pixel rules, no shadows, no gradients.
- Large uppercase headlines, strong geometric layout, and visible grid logic.

Video legibility constraints:

- Headlines: 60-80 pt.
- Diagram labels: 28-40 pt.
- Supporting text: at least 24 pt.
- No more than 10-15 non-diagram words per slide beyond the headline.
- Use thick arrows and large blocks rather than product screenshots.
- Maintain high contrast and never encode meaning by color alone.

## Deliverables

- An editable PowerPoint deck containing the four slides.
- A source script that deterministically regenerates the deck.
- Rendered slide images for visual inspection.
- Speaker notes or a separate narration file with one concise voiceover line per slide.

## Acceptance criteria

- A viewer can state the four-step idea after watching once: repeat requests, detect pattern, create/reuse a tool, compound a modifiable tool library.
- Every slide is readable at video size without pausing.
- The deck uses truthful Appstract concepts and concrete examples grounded in the repository.
- The slides do not imply that the current prototype performs live model-based pattern discovery or arbitrary code generation.
- Text and shapes remain editable in PowerPoint.
