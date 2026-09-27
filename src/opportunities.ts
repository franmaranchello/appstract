// Ledger content for the four prepared patterns, carried over from the signals
// design study in findings/. Evidence is resolved from chat-histories/json at
// load: `snaps` pull real turns by turn number or by the first matching turn.

export const signalDefs = {
  prime: {
    label: "Re-priming",
    def: "Same firm-context paste at the top of the session",
  },
  cadence: {
    label: "Fixed cadence",
    def: "Same job on a weekly or monthly rhythm with new inputs",
  },
  shape: {
    label: "Repeated output",
    def: "Same table, memo or scorecard shape re-specified each time",
  },
  rule: {
    label: "Rule re-taught",
    def: "A firm rule the assistant got wrong and had to be told again",
  },
  script: {
    label: "Script lost",
    def: "A script written in chat, lost, and rebuilt worse",
  },
  paste: {
    label: "Paste round-trip",
    def: "Export from a system, paste into chat, paste back into another",
  },
  drift: {
    label: "Quality drift",
    def: "Same request, different or wrong-shaped answer",
  },
};
export type SignalKey = keyof typeof signalDefs;

export interface SnapshotSpec {
  sid: string;
  n?: number;
  match?: RegExp;
  role?: "user" | "assistant";
  cap: string;
  flag?: string;
}
export interface ToolPlan {
  inputs: string[];
  rules: string[];
  outputs: string[];
  steps: string[];
  effort: string;
}
export interface Opportunity {
  kind: string;
  who: string[];
  line: string;
  build: string;
  cost: string;
  signalKeys: SignalKey[];
  repeats: [shape: string, count: string][];
  snaps: SnapshotSpec[];
  plan: ToolPlan;
}

export const opportunities: Record<string, Opportunity> = {
  clash: {
    kind: "Tool",
    who: ["Priya"],
    line: "Turn a raw Navisworks export into grouped issues, a New / Carried / Gone diff, a tracker CSV and the Monday agenda.",
    build:
      "A parser and rule file that turns Friday's Navisworks XML into grouped issues, the weekly diff, the tracker CSV, the agenda and consultant emails.",
    cost: "28–38 h / week across three projects (cd-018)",
    signalKeys: ["prime", "cadence", "shape", "rule", "script", "paste"],
    repeats: [
      ["Grouped issue table", "19× in 8 sessions"],
      ["Coordination email", "16× in 10 sessions"],
      ["Meeting agenda", "9× in 8 sessions"],
    ],
    snaps: [
      {
        sid: "cd-009",
        n: 2,
        cap: "New / Carried / Gone diff, rebuilt by hand from HTML pasted into Excel",
      },
      {
        sid: "cd-004",
        n: 2,
        cap: "Structural assigned the move, against the firm rule",
        flag: "Rule broken",
      },
      {
        sid: "cd-009",
        n: 10,
        cap: "Tracker CSV she pastes into her own spreadsheet",
      },
      { sid: "cd-009", n: 12, cap: "45-minute agenda, rebuilt every week" },
    ],
    plan: {
      inputs: [
        "Navisworks XML clash export (feet)",
        "Last week's grouped issue list",
        "Model upload log (filename, date)",
      ],
      rules: [
        "Report by issue, never by raw clash",
        "IDs: PROJECT-LEVEL-DISCIPLINE PAIR-NN",
        'Ignore insulation clashes under 1/2"',
        'Plenum under 10\'-0" AFF = P1; corridors need 8" MEP clearance',
        "Structural reviews, never owns the move",
        'Stale = carried 6+ weeks; "known / next model" is not closure',
      ],
      outputs: [
        "Grouped issue table with owner + reviewer",
        "New / Carried / Gone diff with stale flags",
        "Tracker CSV (issue_id, change, age_weeks, owner, next_action, agenda_order)",
        "Agenda at 45 or 15 minutes",
        "One email per consultant",
      ],
      steps: [
        "Parser for the XML export, versioned in this repo, not in a chat",
        "Rule file the parser reads, editable by Priya",
        "Diff against last week's saved run",
        "Templates for agenda, CSV and consultant email",
      ],
      effort: "M",
    },
  },
  finance: {
    kind: "Tool",
    who: ["Marcus"],
    line: "Clean the Vantagepoint export, compute earned fee and burn, and draft Wes's pack and Elena's page from one run.",
    build:
      "An export cleaner and calculator that produces the WIP RAG table, earned-fee math, Wes's pack and Elena's page, with totals computed in code.",
    cost: "3.0 days direct, 3.5 elapsed, every month (fin-017)",
    signalKeys: ["prime", "cadence", "shape", "rule", "script", "drift"],
    repeats: [
      ["13-week cash-flow table", "16× in 12 sessions"],
      ["WIP / RAG table", "12× in 8 sessions"],
      ["Elena one-page version", "11× in 8 sessions"],
    ],
    snaps: [
      { sid: "fin-005", n: 2, cap: "April close: WIP RAG table" },
      { sid: "fin-008", n: 2, cap: "May close: the same table, new numbers" },
      {
        sid: "fin-008",
        match: /Check the total/,
        role: "user",
        cap: "Marcus catches a wrong total",
        flag: "Arithmetic error",
      },
    ],
    plan: {
      inputs: [
        "Vantagepoint WIP export (CSV)",
        "Late-timesheet list",
        "AR aging",
        "PM percent-complete notes",
      ],
      rules: [
        "Net revenue = gross − consultants − reimbursables",
        "Never a multiplier on gross",
        "Cut at Friday week-ending; FY ends Dec 31",
        "$000, no cents",
        "Burn: red >105%, amber 95–105%, green <95%",
        "Label every figure actual, forecast or PM judgment",
      ],
      outputs: [
        "WIP RAG table by project and phase",
        "Earned fee = contract × % complete; burn = spent ÷ earned",
        "Wes narrative, five bullets with owners",
        "Elena page: cash first, then backlog",
      ],
      steps: [
        "Export cleaner that tolerates column drift",
        "Totals computed in code, never by the model",
        "Pack templates for Wes and Elena",
        "Pre-close checklist: timesheets, reimbursables, phase coding, AR backup",
      ],
      effort: "M",
    },
  },
  vendor: {
    kind: "Tool",
    who: ["Dana"],
    line: "Tier the vendor from its answers, score six categories with weights, list the gaps and draft the follow-up questions.",
    build:
      "An intake form that tiers each vendor from its answers, fills the weighted six-category scorecard and drafts the follow-ups and memo.",
    cost: "One grind session per vendor, 14 vendors in 6 months",
    signalKeys: ["prime", "shape", "rule", "paste"],
    repeats: [
      ["Follow-up question list", "25× in 14 sessions"],
      ["Six-category scorecard", "16× in 14 sessions"],
      ["Memo / email to owner", "20× in 13 sessions"],
    ],
    snaps: [
      {
        sid: "ven-002",
        n: 8,
        cap: "Six-category scorecard, second attempt after Dana downgraded Security",
      },
      {
        sid: "ven-009",
        match: /You did it again/,
        role: "user",
        cap: "Desktop add-in tiered as Tier 2, twice",
        flag: "Rule broken",
      },
      { sid: "ven-002", n: 10, cap: "Pointed follow-up questions" },
      { sid: "ven-002", n: 12, cap: "Recommendation memo to Sandeep and Wes" },
    ],
    plan: {
      inputs: [
        "Vendor questionnaire answers or trust-center text",
        "Contract / DPA excerpts",
        "Requesting project and owner",
      ],
      rules: [
        "Tier 1 = touches project models or client data, even desktop-only",
        "Tier 1 needs SOC 2 Type II or ISO 27001, a DPA, $2M cyber, HRA additional insured",
        "AI tools need contractual no-training",
        "Non-US storage needs Wes's sign-off",
      ],
      outputs: [
        "Tier with the reason",
        "Scorecard: Security, Data & Privacy, Legal & Insurance, Operational Fit, Commercial, References (1–5, weighted)",
        "Go / Go with conditions / No",
        "Follow-up questions, memo, tracker line",
      ],
      steps: [
        "Intake form that captures answers once",
        "Tier gate evaluated from answers, not from chat",
        "Scorecard template with fixed weights",
        "Writes the tracker line to the register",
      ],
      effort: "S",
    },
  },
  submittals: {
    kind: "Tool",
    who: ["Tomás"],
    line: "Batch a submittal package into paragraph-numbered comments with a status and routing, instead of pasting it one chunk at a time.",
    build:
      "A batch reviewer that takes a Procore package and returns a status and a paragraph-numbered comment for every item, with routing.",
    cost: "11 h / week of admin before any technical review (spec-020)",
    signalKeys: ["prime", "cadence", "shape", "paste", "drift"],
    repeats: [
      ["Paragraph-numbered comment", "76× in 9 sessions"],
      ['"Same exercise, next chunk" paste', "most turns in 9 sessions"],
    ],
    snaps: [
      {
        sid: "spec-012",
        n: 4,
        cap: "Comment 2 of a 41-item Kestrel Friday dump",
      },
      {
        sid: "spec-009",
        n: 2,
        cap: "Bid-night bracket hunt answered with the submittal-comment template",
        flag: "Wrong output",
      },
    ],
    plan: {
      inputs: [
        "Procore submittal batch (PDF + metadata)",
        "Spec sections in Specpoint",
        "Consultant routing table",
      ],
      rules: [
        "Every comment cites section and paragraph",
        "22 / 23 / 26 go to Pemberton unless stated",
        "Review period runs from complete receipt, not batch upload",
        "Comment, never a rewrite or design direction",
      ],
      outputs: [
        "Status per item (Approved, Approved as noted, Revise and resubmit, N/A)",
        "Numbered comments ready for Procore / Bluebeam",
        "Routing notes to Sturgis or Pemberton",
        "Turnaround log by received date",
      ],
      steps: [
        "Batch intake from a Procore export",
        "Section lookup against the project manual",
        "Comment generator with house rules",
        "Turnaround metrics for Elena's page",
      ],
      effort: "M",
    },
  },
};
