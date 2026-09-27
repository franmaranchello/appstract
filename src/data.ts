import clashHistory from "../chat-histories/json/01-clash-detection-priya-raghunathan.json";
import financeHistory from "../chat-histories/json/02-project-finance-marcus-oyelaran.json";
import vendorHistory from "../chat-histories/json/03-vendor-review-dana-whitfield.json";
import submittalHistory from "../chat-histories/json/04-specs-submittals-tomas-ferreira.json";

export interface HistorySource {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  filename: string;
  sessions: number;
  turns: number;
  range: string;
  color: "blue" | "red" | "yellow" | "ink";
}
export interface Evidence {
  id: string;
  sessionId: string;
  title: string;
  date: string;
  quote: string;
  author: string;
}
export interface Pattern {
  id: string;
  rank: number;
  title: string;
  category: string;
  description: string;
  outcome: string;
  sourceId: string;
  sessionIds: string[];
  frequencyLabel: string;
  input: string;
  output: string;
  evidence: Evidence[];
  signals: string[];
}

// Prepared, manually curated analysis of the checked-in synthetic corpus.
// This module does not call a model or claim live discovery. Rank is editorial
// demo order, not an inferred confidence score or cross-person demand count.
export const analysisMetadata = {
  mode: "prepared" as const,
  label: "Prepared analysis",
  provenance: "Manually curated from the synthetic HRA conversation histories.",
  ranking: "Editorial demo order; one request per selected session.",
};

const histories = [
  clashHistory,
  financeHistory,
  vendorHistory,
  submittalHistory,
];
const sourceAppearance: Pick<
  HistorySource,
  "initials" | "department" | "filename" | "color"
>[] = [
  {
    initials: "PR",
    department: "BIM coordination",
    filename: "01-clash-detection-priya-raghunathan.json",
    color: "blue",
  },
  {
    initials: "MO",
    department: "Project finance",
    filename: "02-project-finance-marcus-oyelaran.json",
    color: "red",
  },
  {
    initials: "DW",
    department: "Operations & procurement",
    filename: "03-vendor-review-dana-whitfield.json",
    color: "yellow",
  },
  {
    initials: "TF",
    department: "Specifications",
    filename: "04-specs-submittals-tomas-ferreira.json",
    color: "ink",
  },
];
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));

export const sources: HistorySource[] = histories.map((history, index) => {
  const dates = history.sessions
    .map((session) => session.started_at.slice(0, 10))
    .sort();
  return {
    id: history.persona.id,
    name: history.persona.name,
    role: history.persona.role,
    ...sourceAppearance[index],
    sessions: history.sessions.length,
    turns: history.sessions.reduce(
      (sum, session) => sum + session.turns.length,
      0,
    ),
    range: `${dateLabel(dates[0])} – ${dateLabel(dates[dates.length - 1])}`,
  };
});

export const corpusStats = {
  sessions: sources.reduce((sum, source) => sum + source.sessions, 0),
  turns: sources.reduce((sum, source) => sum + source.turns, 0),
  people: new Set(histories.map((history) => history.persona.id)).size,
  userTurns: histories.reduce(
    (sum, history) =>
      sum +
      history.sessions.reduce(
        (total, session) =>
          total + session.turns.filter((turn) => turn.role === "user").length,
        0,
      ),
    0,
  ),
};

export function getHistoryJson(sourceId: string): string {
  const history = histories.find((item) => item.persona.id === sourceId);
  if (!history) throw new Error(`Unknown history source: ${sourceId}`);
  return JSON.stringify(history, null, 2);
}

// A quote is an exact contiguous substring of an original user turn. Markers
// select the actual task instead of repeated persona/context boilerplate.
function evidence(
  sourceId: string,
  sessionId: string,
  marker: string,
): Evidence {
  const history = histories.find((item) => item.persona.id === sourceId);
  const session = history?.sessions.find((item) => item.id === sessionId);
  const turn = session?.turns.find(
    (item) => item.role === "user" && item.content.includes(marker),
  );
  if (!history || !session || !turn)
    throw new Error(`Missing prepared evidence: ${sessionId} / ${marker}`);
  const excerpt = turn.content.slice(
    turn.content.indexOf(marker),
    turn.content.indexOf(marker) + 300,
  );
  // End on a word boundary without adding an invented ellipsis to source text.
  const quote =
    excerpt.length === 300
      ? excerpt.slice(0, excerpt.lastIndexOf(" "))
      : excerpt;
  return {
    id: `${sourceId}/${sessionId}/${turn.n}`,
    sessionId,
    title: session.title,
    date: dateLabel(turn.at || session.started_at),
    quote,
    author: history.persona.name,
  };
}

type CuratedPattern = Omit<
  Pattern,
  "evidence" | "sessionIds" | "frequencyLabel"
> & {
  selections: [sessionId: string, marker: string][];
};
function prepare({ selections, ...pattern }: CuratedPattern): Pattern {
  return {
    ...pattern,
    sessionIds: selections.map(([id]) => id),
    frequencyLabel: `${selections.length} sessions · 1 requester`,
    evidence: selections.map(([sessionId, marker]) =>
      evidence(pattern.sourceId, sessionId, marker),
    ),
  };
}

export const patterns: Pattern[] = [
  prepare({
    id: "clash",
    rank: 1,
    title: "Clash coordination",
    category: "BIM coordination",
    description:
      "Priya repeatedly turns raw Navisworks exports into grouped issues with owners, priorities and coordination actions.",
    outcome: "Turn the weekly export into a consistent, reusable issue report.",
    sourceId: "clash-detection",
    input:
      "Navisworks clash rows or XML, grouping rules and previous issue list",
    output:
      "Grouped issue CSV with stable IDs, owners, priorities and weekly changes",
    signals: [
      "Repeated export-to-report workflow",
      "The grouping script was lost and requested again",
    ],
    selections: [
      ["cd-003", "collapse raw rows"],
      ["cd-005", "collapse raw rows"],
      ["cd-006", "I can't keep manually grouping"],
      ["cd-008", "collapse raw rows"],
      ["cd-011", "collapse raw rows"],
      ["cd-015", "Two months ago another model"],
      ["cd-016", "collapse raw rows"],
      ["cd-020", "collapse raw rows"],
    ],
  }),
  prepare({
    id: "finance",
    rank: 2,
    title: "Monthly close pack",
    category: "Project finance",
    description:
      "Marcus asks for the same WIP and receivables review pack each month, with project commentary and a one-page leadership summary.",
    outcome:
      "Give each monthly close a consistent review format with traceable inputs.",
    sourceId: "project-finance",
    input: "Vantagepoint WIP/AR extract and project notes",
    output:
      "Project variance commentary, status flags and a one-page close summary",
    signals: [
      "Seven selected monthly close sessions",
      "Stable input and output format",
      "One requester; not seven independent people",
    ],
    selections: [
      "fin-003",
      "fin-005",
      "fin-008",
      "fin-010",
      "fin-013",
      "fin-016",
      "fin-020",
    ].map(
      (id) =>
        [id, "Here is the Vantagepoint WIP/AR extract"] as [string, string],
    ),
  }),
  prepare({
    id: "vendor",
    rank: 3,
    title: "Vendor review scorecard",
    category: "Operations & procurement",
    description:
      "Dana repeats a six-category vendor review with evidence gaps, tier-specific requirements and a recommendation for the approver.",
    outcome:
      "Keep vendor reviews consistent while making missing evidence visible.",
    sourceId: "vendor-review",
    input: "Vendor questionnaire, supporting evidence and proposed data access",
    output:
      "Six-category scorecard, open requirements and review recommendation",
    signals: [
      "Same six-category review requested across vendors",
      "Tier-specific gates recur",
      "Recommendation supports a human approval decision",
    ],
    selections: [
      "ven-002",
      "ven-003",
      "ven-004",
      "ven-005",
      "ven-007",
      "ven-009",
      "ven-010",
      "ven-011",
      "ven-012",
      "ven-013",
      "ven-014",
      "ven-016",
      "ven-017",
      "ven-020",
    ].map((id) => [id, "Today's vendor:"] as [string, string]),
  }),
  prepare({
    id: "submittals",
    rank: 4,
    title: "Submittal register",
    category: "Specifications",
    description:
      "Tomás repeatedly extracts submittal requirements from specifications and recreates a register format for Excel and Procore.",
    outcome:
      "Preserve a reusable register with section and paragraph references.",
    sourceId: "specs-submittals",
    input: "Specification sections and reviewer responsibilities",
    output:
      "Action and informational submittals with paragraph references and reviewers",
    signals: [
      "Register requirements recur across specifications",
      "Lost register and CSV format are requested again",
      "Human review remains necessary for technical requirements",
    ],
    selections: [
      ["spec-001", "Task is the same as usual:"],
      ["spec-002", "Task is the same as usual:"],
      ["spec-004", "Task is the same as usual:"],
      ["spec-006", "I need to build a submittal register"],
      ["spec-010", "Task is the same as usual:"],
      ["spec-011", "I lost the submittal-register CSV"],
    ],
  }),
];
