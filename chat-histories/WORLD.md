# Shared world bible — Halden & Reyes Architects

All four chat histories are set in the same fictional firm. Every generated
history MUST use these names, projects, dates and vocabulary so the four
corpora cross-reference each other.

## The firm

**Halden & Reyes Architects (HRA)** — 140 people. Seattle HQ (Pioneer Square),
satellite office in Denver. Mixed portfolio: mid-rise residential, healthcare,
civic, and lab/R&D fit-out. Revit-based BIM shop, Navisworks for coordination,
Deltek Specpoint for specs, Deltek Vantagepoint for project accounting,
Procore on the two largest jobs, Bluebeam for markups, SharePoint + Teams for
everything else. IT is two people and an MSP.

## Active projects (referred to by nickname)

| Nickname | Full name | Type | Value | Notes |
|---|---|---|---|---|
| **Mercer** | Mercer Commons | 11-storey mixed-use residential, Seattle | $78M | Largest job. CD phase Mar–Jul 2026, CA starts Aug. GC: Trelane Construction. |
| **Bayline** | Bayline Medical Pavilion | 4-storey outpatient clinic, Tacoma | $52M | Heaviest MEP coordination. OSHPD-equivalent state review. GC: Corvin Builders. |
| **Northgate** | Northgate Civic Library | Civic, Denver | $31M | Public client (City of Denver), prevailing wage, tight FF&E budget. |
| **Kestrel** | Kestrel Labs Phase II | R&D lab fit-out, Bellevue | $44M | Fast-track. Client is a biotech, heavy security/NDA requirements. |
| **Harbor Point** | Harbor Point Residences | Pursuit / early SD | ~$60M (unsigned) | Go/no-go pursuit, appears in finance history as a pipeline item. |

## Recurring people

- **Priya Raghunathan** — BIM Coordinator. Owns clash detection. (Persona 1)
- **Marcus Oyelaran** — Project Financial Analyst. Owns cash flow. (Persona 2)
- **Dana Whitfield** — Operations & IT Procurement Lead. Owns vendor/security review. (Persona 3)
- **Tomás Ferreira** — Senior Architect & firmwide Specifier. Owns specs + submittals. (Persona 4)
- **Elena Reyes** — Managing Principal. Wants one-page summaries, hates spreadsheets.
- **Grant Halden** — Founding Principal, semi-retired, design side.
- **Wes Okonkwo** — Director of Operations. Dana and Marcus both report to him.
- **Sandeep Mehta** — Project Manager on Mercer and Harbor Point.
- **Claudia Barros** — Project Architect on Bayline.
- **Ryan Teague** — IT Manager (one of the two IT people).
- **Jenna Liu** — Junior designer / Priya's part-time helper on model cleanup.

## External parties

- **Trelane Construction** — GC on Mercer.
- **Corvin Builders** — GC on Bayline.
- **Pemberton MEP** — mechanical/electrical/plumbing engineer, Bayline + Mercer. Slow to respond, models are messy.
- **Sturgis Structural** — structural engineer. Good models, ships late.
- **Avalon Civil** — civil/site.
- **Kirsch Fire Protection** — sprinkler subcontractor, models direct from the sub, often unversioned.

## Timeline

The corpus runs **2 March 2026 → 18 September 2026**, roughly 6.5 months.
Sessions should be spread unevenly across that window — clustered around
milestones, with dead weeks in between.

Known firmwide milestones to reference:
- **20 Mar 2026** — Mercer 75% CD set to client
- **17 Apr 2026** — Bayline permit submission
- **1 May 2026** — HRA fiscal Q3 starts; Wes asks everyone for forecasts
- **29 May 2026** — Mercer 100% CD / bid set
- **12 Jun 2026** — Northgate GMP reconciliation meeting
- **6 Jul 2026** — Kestrel Phase II construction start, submittals begin flooding in
- **14 Aug 2026** — Mercer construction administration begins
- **9 Sep 2026** — Board/principals quarterly review; Elena wants one page per discipline

## Models the staff use

Staff have access to several assistants through a firm-provided chat portal and
sometimes go direct. Vary which one is used per session, and let the persona
have opinions about them (e.g. "going back to the other one, this one keeps
reformatting my table"). Use these labels verbatim:

- `GPT-5.4`
- `Claude Opus 4.5`
- `Gemini 3 Pro`
- `Copilot (M365)`
- `Claude Sonnet 4.5`

## Tone rules

- These are **working transcripts**, not demos. Typos, lowercase starts,
  abandoned sentences, "ignore that, wrong file", pasted error text.
- The user frequently pastes the same boilerplate context because the assistant
  has no memory across sessions. This repetition is the point — it is the
  signal we mine later.
- Users get frustrated, re-ask, correct the model, and sometimes give up and do
  it by hand.
- Assistant replies are competent but generic: they don't know the firm's
  standards, so the user has to re-teach them every time.
- Never mention that this is synthetic data. No meta-commentary. No
  "pattern analysis" sections inside the transcripts.
