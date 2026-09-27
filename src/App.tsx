import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  sources,
  corpusStats,
  getHistoryJson,
  ledger,
  corpusWindow,
  metricScores,
  type Pattern,
  type LedgerRow,
  type Snapshot,
  type MetricKey,
} from "./data";
import { Markdown } from "./markdown";
import {
  extendApp,
  routeRequest,
  buildLaunchUrl,
  validateApp,
  type AppRecord,
  type AppVersion,
} from "./domain";
import { discoverClashApp, mergeDiscoveredApp } from "./registry";

type View = "history" | "patterns" | "apps" | "request";
type ModalKind =
  | { kind: "json"; sourceId: string }
  | { kind: "brief"; pattern: Pattern }
  | { kind: "snap"; snap: Snapshot }
  | { kind: "reset" }
  | null;
type RequestEvent = {
  person: string;
  request: string;
  action: "REUSE" | "EXTEND";
  versionId: string;
  at: string;
};
const STORAGE_KEY = "appstract-connected-demo-v1";
function loadSaved() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      app: validateApp(state.app),
      analyzed: state.analyzed === true,
      events: Array.isArray(state.events)
        ? (state.events
            .filter(
              (event: RequestEvent) =>
                typeof event?.person === "string" &&
                typeof event?.request === "string" &&
                typeof event?.versionId === "string" &&
                ["REUSE", "EXTEND"].includes(event.action),
            )
            .slice(-20) as RequestEvent[])
        : [],
    };
  } catch {
    return { app: null, analyzed: false, events: [] as RequestEvent[] };
  }
}
const saved = loadSaved();
const initialView = (): View =>
  ["history", "patterns", "apps", "request"].includes(location.hash.slice(1))
    ? (location.hash.slice(1) as View)
    : "history";
const examples = [
  "Run the clash check on the sample model.",
  "I’m color-blind. Can you make the same tool easier to read with labels and shapes?",
  "Group this Navisworks XML export into issues.",
];
function appBaseUrl() {
  if (import.meta.env.VITE_CLASH_APP_URL || import.meta.env.VITE_DEMO_APP_URL)
    return (
      import.meta.env.VITE_CLASH_APP_URL || import.meta.env.VITE_DEMO_APP_URL
    );
  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname))
    return `${location.protocol}//${location.hostname}:${location.port === "4173" ? "4186" : "5186"}/`;
  return new URL("/apps/clash-detection/", location.origin).href;
}
function Arrow() {
  return (
    <span aria-hidden="true" className="arrow">
      →
    </span>
  );
}
function BrandMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 788 511"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="var(--blue)"
        d="M0 0 491 0 607 329 607 509 498 509 358.7 107 0 107Z"
      />
      <path fill="var(--yellow)" d="M0 145h332l36.7 106H0z" />
      <path fill="var(--red)" d="M0 289h381.9l36.4 105H0z" />
      <path fill="var(--blue)" d="M0 425h429l29.1 84H0z" />
      <path fill="var(--ink)" d="M638 319h150v164H638z" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M3.5 6l4.5 4.5L12.5 6" />
    </svg>
  );
}
const METERS: {
  key: MetricKey;
  label: string;
  tip: string;
  format: (value: number) => ReactNode;
}[] = [
  {
    key: "sessions",
    label: "Sessions",
    tip: "Sessions where this job came up",
    format: (value) => value,
  },
  {
    key: "tokens",
    label: "Tokens",
    tip: "Transcript tokens across those sessions (characters / 4)",
    format: (value) =>
      value >= 1000 ? (
        <>
          {(value / 1000).toFixed(1)}
          <small>k</small>
        </>
      ) : (
        value
      ),
  },
  {
    key: "minutes",
    label: "Chat time",
    tip: "Elapsed time from first to last turn, summed",
    format: (value) =>
      value >= 60 ? (
        <>
          {(value / 60).toFixed(1)}
          <small>h</small>
        </>
      ) : (
        <>
          {value}
          <small>m</small>
        </>
      ),
  },
];
function Metrics({ row }: { row: LedgerRow }) {
  return (
    <div className="mets">
      {METERS.map((meter) => {
        const score = metricScores[row.id][meter.key];
        return (
          <div
            className="met"
            key={meter.key}
            title={`${meter.tip}, score ${score} of 5`}
          >
            <div className="k">{meter.label}</div>
            <div className="v">{meter.format(row.metrics[meter.key])}</div>
            <div
              className="meter"
              role="img"
              aria-label={`Score ${score} of 5`}
            >
              {[1, 2, 3, 4, 5].map((step) => (
                <i className={step <= score ? "on" : ""} key={step} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WINDOW_START = Date.parse(corpusWindow.start);
const WINDOW_END = Date.parse(corpusWindow.end);
const TICKS = (() => {
  const ticks: string[] = [];
  const cursor = new Date(WINDOW_START);
  cursor.setUTCDate(1);
  while (cursor.getTime() <= WINDOW_END) {
    ticks.push(MONTHS[cursor.getUTCMonth()][0]);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
})();
function Cadence({ row }: { row: LedgerRow }) {
  const at = (date: string) =>
    ((Date.parse(date) - WINDOW_START) / (WINDOW_END - WINDOW_START)) * 100;
  return (
    <div
      className="cad"
      role="img"
      aria-label={`${row.briefs.length} sessions across the corpus window`}
    >
      <div className="cad-track" />
      {row.briefs.map((brief) => (
        <span
          className="cad-dot"
          key={brief.id}
          style={{ left: `${at(brief.date).toFixed(2)}%` }}
          title={`${brief.id} · ${brief.dateLabel} · ${brief.title}`}
        />
      ))}
      <div className="cad-ticks" aria-hidden="true">
        {TICKS.map((tick, index) => (
          <span key={index}>{tick}</span>
        ))}
      </div>
    </div>
  );
}
function Shot({ snap, onOpen }: { snap: Snapshot; onOpen: () => void }) {
  return (
    <figure className={`shot ${snap.role === "user" ? "user" : ""}`}>
      <div className="shot-frame">
        <div className="shot-bar">
          <b>{snap.speaker}</b>
          <span>
            {snap.sessionId} · {snap.atLabel}
          </span>
        </div>
        <div className="shot-body md" aria-hidden="true">
          <Markdown text={snap.text.slice(0, 1400)} />
        </div>
        {snap.flag && <span className="shot-flag">{snap.flag}</span>}
        <button
          className="shot-open"
          onClick={onOpen}
          aria-label={`Read the full turn: ${snap.caption}`}
        />
      </div>
      <figcaption>{snap.caption}</figcaption>
    </figure>
  );
}
function PlanView({ row }: { row: LedgerRow }) {
  return (
    <div className="plan">
      <div>
        <h5 className="label">Inputs</h5>
        <ul>
          {row.plan.inputs.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h5 className="label">Outputs</h5>
        <ul>
          {row.plan.outputs.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h5 className="label">Rules it enforces</h5>
        <ul>
          {row.plan.rules.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h5 className="label">Build plan</h5>
        <ol>
          {row.plan.steps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
      <div className="full">
        <h5 className="label">Cost they reported</h5>
        <p style={{ margin: 0 }}>{row.cost}</p>
      </div>
      <div className="full">
        <h5 className="label">What repeats</h5>
        <div className="repeats">
          {row.repeats.map(([shape, count]) => (
            <div key={shape}>
              <span>{shape}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  );
}
export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [selectedSources, setSelectedSources] = useState(
    sources.map((source) => source.id),
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [analyzed, setAnalyzed] = useState(saved.analyzed);
  const [app, setApp] = useState<AppRecord | null>(saved.app);
  const [events, setEvents] = useState<RequestEvent[]>(saved.events);
  const [selectedVersionId, setSelectedVersionId] = useState(
    saved.app?.currentVersionId || "",
  );
  const [modal, setModal] = useState<ModalKind>(null);
  const [request, setRequest] = useState("");
  const [persona, setPersona] = useState("Claudia Barros");
  const [route, setRoute] = useState<ReturnType<typeof routeRequest> | null>(
    null,
  );
  const [registryState, setRegistryState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [registryError, setRegistryError] = useState("");
  const [retry, setRetry] = useState(0);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const appRef = useRef(app);
  appRef.current = app;
  const selected = sources.filter((source) =>
    selectedSources.includes(source.id),
  );
  const visibleLedger = ledger.filter((row) =>
    selectedSources.includes(row.sourceId),
  );
  function toggleRow(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const selectedVersion =
    app?.versions.find((version) => version.id === selectedVersionId) ||
    app?.versions.find((version) => version.id === app.currentVersionId);

  function persist(nextApp: AppRecord | null, nextEvents = events) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ app: nextApp, analyzed, events: nextEvents }),
      );
      setStorageError(false);
      return true;
    } catch {
      setStorageError(true);
      return false;
    }
  }
  useEffect(() => {
    persist(app, events);
  }, [app, analyzed, events]);
  useEffect(() => {
    const onHash = () => setView(initialView());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);
  const shouldDiscover =
    view === "apps" ||
    view === "request" ||
    (view === "patterns" &&
      analyzed &&
      visibleLedger.some((row) => row.id === "clash"));
  useEffect(() => {
    if (!shouldDiscover) return;
    const controller = new AbortController();
    setRegistryState("loading");
    setRegistryError("");
    discoverClashApp(appBaseUrl(), controller.signal)
      .then((discovered) => {
        if (controller.signal.aborted) return;
        const next = mergeDiscoveredApp(discovered, appRef.current);
        setApp(next);
        setSelectedVersionId((current) =>
          next.versions.some((version) => version.id === current)
            ? current
            : next.currentVersionId,
        );
        setRegistryState("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRegistryState("error");
        setRegistryError(
          error instanceof Error ? error.message : "The app is unavailable.",
        );
      });
    return () => controller.abort();
  }, [shouldDiscover, retry]);
  function navigate(next: View) {
    setView(next);
    location.hash = next;
    window.scrollTo({ top: 0 });
    setTimeout(() => titleRef.current?.focus(), 0);
  }
  function launch(
    targetApp: AppRecord,
    version: AppVersion,
    nextEvents = events,
  ) {
    const returnTo = new URL(location.pathname, location.origin);
    returnTo.hash = "request";
    const url = buildLaunchUrl(targetApp, version, returnTo.href);
    if (!url) {
      setToast("This app could not be opened. Retry the app check.");
      return;
    }
    // Save before same-tab navigation so the return journey keeps the exact version.
    if (!persist(targetApp, nextEvents)) {
      setToast(
        "Could not save this version. Allow browser storage, then try opening the app again.",
      );
      return;
    }
    location.assign(url);
  }
  function openVersion(version = selectedVersion) {
    if (!app || !version || registryState !== "ready") return;
    setSelectedVersionId(version.id);
    const person = view === "patterns" ? "Priya Raghunathan" : persona;
    const nextEvents = [
      ...events,
      {
        person,
        request:
          view === "patterns"
            ? "Run clash detection on the sample model."
            : request || "Open clash detection.",
        action: "REUSE" as const,
        versionId: version.id,
        at: new Date().toISOString(),
      },
    ].slice(-20);
    setEvents(nextEvents);
    launch(app, version, nextEvents);
  }
  function extendAndOpen() {
    if (!app || registryState !== "ready") return;
    const next = extendApp(app, request, persona);
    const version = next.versions.find(
      (item) => item.id === next.currentVersionId,
    )!;
    const nextEvents = [
      ...events,
      {
        person: persona,
        request,
        action: "EXTEND" as const,
        versionId: version.id,
        at: new Date().toISOString(),
      },
    ].slice(-20);
    setApp(next);
    setSelectedVersionId(version.id);
    setEvents(nextEvents);
    launch(next, version, nextEvents);
  }
  function checkRequest() {
    if (registryState !== "ready" || !app) return;
    setRoute(routeRequest(request, app));
  }
  function RegistryMatch() {
    return (
      <div className="registry-match" aria-live="polite">
        {registryState === "loading" || registryState === "idle" ? (
          <p className="match-status">Checking available apps…</p>
        ) : registryState === "error" ? (
          <>
            <div>
              <strong>Clash detection is unavailable</strong>
              <p className="muted">Retry when the app is running.</p>
              <details>
                <summary>Details</summary>
                <p className="caption">{registryError}</p>
              </details>
            </div>
            <button
              className="button secondary"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry <Arrow />
            </button>
          </>
        ) : app ? (
          <>
            <div className="match-summary">
              <span className="small-label">
                <span className="status-dot" />
                Existing app found
              </span>
              <strong>{app.name}</strong>
              <p className="muted">
                Sample model checks · v
                {app.versions.find(
                  (version) => version.id === app.currentVersionId,
                )?.number || 1}
              </p>
            </div>
            <button
              className="button primary"
              onClick={() =>
                openVersion(
                  app.versions.find(
                    (version) => version.id === app.currentVersionId,
                  ),
                )
              }
            >
              Open app <Arrow />
            </button>
          </>
        ) : null}
      </div>
    );
  }
  const titles: Record<View, [string, string]> = {
    history: ["Conversation history", "Select the conversations to review."],
    patterns: [
      "Detected patterns",
      "Repeated tasks, with the requests behind them.",
    ],
    apps: ["Apps", "Open an existing app or review its versions."],
    request: [
      "New request",
      "Find an app your team already uses, then reuse or extend it.",
    ],
  };
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate("history")}
          aria-label="Appstract home"
        >
          <BrandMark />
          <span className="wordmark">appstract</span>
        </button>
        <nav aria-label="Main navigation">
          {(["history", "patterns", "apps"] as const).map((item, index) => (
            <button
              key={item}
              className={`nav-item ${view === item ? "active" : ""}`}
              aria-current={view === item ? "page" : undefined}
              onClick={() => navigate(item)}
            >
              <span className="nav-number">0{index + 1}</span>
              {item}
            </button>
          ))}
        </nav>
        <div className="org-switch">Halden & Reyes</div>
        <button
          className="button primary new-request"
          onClick={() => {
            setRoute(null);
            navigate("request");
          }}
        >
          New request <span aria-hidden="true">＋</span>
        </button>
      </header>
      <main className="workspace" id="main-content" tabIndex={-1}>
        <section className="page-intro compact">
          <div>
            <h1 className="page-title" ref={titleRef} tabIndex={-1}>
              {titles[view][0]}
            </h1>
            <p className="lead">{titles[view][1]}</p>
          </div>
          <span className="small-label">HRA / Workspace</span>
        </section>
        {storageError && (
          <div className="notice" role="alert">
            Browser storage is unavailable. Versions cannot be saved in this
            browser.
          </div>
        )}
        {view === "history" && (
          <>
            <div className="section-bar">
              <h2>History sources</h2>
              <span className="small-label">
                Sample organization · March–September 2026
              </span>
            </div>
            <div className="history-layout">
              <section className="sources-panel">
                <div className="panel-heading">
                  <h3>Team conversations</h3>
                  <button
                    className="button ghost"
                    onClick={() =>
                      setSelectedSources(
                        selectedSources.length === sources.length
                          ? []
                          : sources.map((source) => source.id),
                      )
                    }
                  >
                    {selectedSources.length === sources.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
                <div className="source-selection">
                  {sources.map((source) => (
                    <div key={source.id} className="source-row">
                      <label className="source-main">
                        <input
                          type="checkbox"
                          checked={selectedSources.includes(source.id)}
                          onChange={() =>
                            setSelectedSources((current) =>
                              current.includes(source.id)
                                ? current.filter((id) => id !== source.id)
                                : [...current, source.id],
                            )
                          }
                          aria-label={`Select ${source.name}'s history`}
                        />
                        <span className={`source-avatar ${source.color}`}>
                          {source.initials}
                        </span>
                        <span className="source-copy">
                          <span className="small-label">
                            {source.department}
                          </span>
                          <strong>{source.name}</strong>
                          <span className="muted">{source.role}</span>
                        </span>
                      </label>
                      <div className="source-meta">
                        <span className="mono">{source.sessions} sessions</span>
                        <span className="muted">{source.turns} messages</span>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() =>
                          setModal({ kind: "json", sourceId: source.id })
                        }
                        aria-label={`View ${source.name}'s JSON`}
                      >
                        ↗
                      </button>
                    </div>
                  ))}
                </div>
                <div className="action-bar">
                  <div>
                    <strong>
                      {selected.reduce(
                        (sum, source) => sum + source.sessions,
                        0,
                      )}{" "}
                      sessions selected
                    </strong>
                    <span className="muted">{selected.length} teammates</span>
                  </div>
                  <button
                    className="button primary"
                    disabled={!selectedSources.length}
                    onClick={() => {
                      setAnalyzed(true);
                      setExpanded(new Set());
                      navigate("patterns");
                    }}
                  >
                    Find patterns <Arrow />
                  </button>
                </div>
              </section>
              <aside className="history-aside">
                <h2>Archive summary</h2>
                <div className="summary-grid">
                  <div className="stat">
                    <strong>{corpusStats.people}</strong>
                    <span>Teammates</span>
                  </div>
                  <div className="stat">
                    <strong>{corpusStats.sessions}</strong>
                    <span>Sessions</span>
                  </div>
                  <div className="stat wide">
                    <strong>{corpusStats.turns.toLocaleString()}</strong>
                    <span>Messages</span>
                  </div>
                </div>
                <p>
                  Clash coordination, project finance, vendor reviews and
                  submittals.
                </p>
                <p className="caption muted">
                  Prepared analysis of the supplied synthetic histories. Every
                  excerpt links to its source session.
                </p>
              </aside>
            </div>
          </>
        )}
        {view === "patterns" && (
          <>
            <div className="section-bar">
              <h2>{analyzed ? visibleLedger.length : 0} recurring workflows</h2>
              <span className="small-label">Prepared analysis</span>
            </div>
            {!analyzed || visibleLedger.length === 0 ? (
              <div className="empty-state">
                <h2>Select a history first</h2>
                <button
                  className="button primary"
                  onClick={() => navigate("history")}
                >
                  Choose histories <Arrow />
                </button>
              </div>
            ) : (
              <div className="ledger">
                {visibleLedger.map((row) => {
                  const open = expanded.has(row.id);
                  return (
                    <Fragment key={row.id}>
                      <article className="lrow">
                        <div className="index">
                          {String(row.rank).padStart(2, "0")}
                        </div>
                        <div className="ltext">
                          <div className="lhead">
                            <h3>{row.title}</h3>
                            <div className="signal-tags" aria-label="Signals">
                              {row.signalLabels.map((signal) => (
                                <span key={signal.label} title={signal.def}>
                                  {signal.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="line">
                            {row.line}{" "}
                            <span className="who">
                              {row.kind} · {row.who.join(", ")}
                            </span>
                          </p>
                        </div>
                        <div className="lana">
                          <Metrics row={row} />
                          <Cadence row={row} />
                          <div className="split">
                            <button
                              className="split-exp"
                              aria-expanded={open}
                              aria-controls={`plan-${row.id}`}
                              aria-label={`${open ? "Collapse" : "Expand"} plan: ${row.title}`}
                              onClick={() => toggleRow(row.id)}
                            >
                              <Chevron />
                            </button>
                            <button
                              className="split-build"
                              onClick={() => {
                                if (row.id === "clash") navigate("apps");
                                else setModal({ kind: "brief", pattern: row });
                              }}
                            >
                              {row.id === "clash" ? "Open app" : "Build tool"}
                              <Arrow />
                            </button>
                          </div>
                        </div>
                      </article>
                      {open && (
                        <section
                          className="lexp"
                          id={`plan-${row.id}`}
                          aria-label={`Plan for ${row.title}`}
                        >
                          {row.id === "clash" && <RegistryMatch />}
                          <div>
                            <h4 className="label">
                              Outputs from the chats · {row.snapshots.length}
                            </h4>
                            <div className="strip">
                              {row.snapshots.map((snap) => (
                                <Shot
                                  key={snap.id}
                                  snap={snap}
                                  onOpen={() =>
                                    setModal({ kind: "snap", snap })
                                  }
                                />
                              ))}
                            </div>
                          </div>
                          <div className="lexp-grid">
                            <div>
                              <h4 className="label">
                                Proposed {row.kind.toLowerCase()}
                              </h4>
                              <PlanView row={row} />
                            </div>
                            <div className="lexp-sessions">
                              <h4 className="label">Sessions</h4>
                              <div className="repeats">
                                {row.briefs.slice(0, 12).map((brief) => (
                                  <div key={brief.id}>
                                    <span>{brief.title}</span>
                                    <span>
                                      {brief.id} · {brief.dateLabel}
                                    </span>
                                  </div>
                                ))}
                                {row.briefs.length > 12 && (
                                  <div>
                                    <span className="muted">
                                      and {row.briefs.length - 12} more
                                    </span>
                                    <span />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            )}
          </>
        )}
        {view === "apps" && (
          <>
            <div className="section-bar">
              <h2>App library</h2>
              <span className="small-label">
                {app ? "1 app" : "Checking apps"}
              </span>
            </div>
            {!app ? (
              <RegistryMatch />
            ) : (
              <div className="apps-layout">
                <section className="app-card">
                  <div className="app-card-top">
                    <div className="app-glyph" aria-hidden="true">
                      <i />
                      <i />
                    </div>
                    <span className="tag">Sample model</span>
                  </div>
                  <h2>{app.name}</h2>
                  <p>Check structural and mechanical elements for clashes.</p>
                  <div className="app-version-display">
                    <span className="version-badge">
                      v{selectedVersion?.number}
                    </span>
                    <div>
                      <strong>
                        {selectedVersion?.presentation === "non-color"
                          ? "Labels & shapes"
                          : "Original view"}
                      </strong>
                      <span className="muted">
                        {selectedVersion?.presentation === "non-color"
                          ? "Color-independent markers and element labels"
                          : "3D model, clash list and element details"}
                      </span>
                    </div>
                  </div>
                  <div className="action-bar">
                    <button
                      className="button primary"
                      disabled={registryState !== "ready"}
                      onClick={() => openVersion()}
                    >
                      Open v{selectedVersion?.number} <Arrow />
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setRequest(examples[1]);
                        setPersona("Claudia Barros");
                        setRoute(null);
                        navigate("request");
                      }}
                    >
                      New teammate request <Arrow />
                    </button>
                  </div>
                  {registryState === "loading" && (
                    <p className="muted" role="status">
                      Checking app availability…
                    </p>
                  )}
                  {registryState === "error" && (
                    <div className="inline-error">
                      <p>App unavailable. Your versions are saved.</p>
                      <button
                        className="button secondary"
                        onClick={() => setRetry((value) => value + 1)}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </section>
                <aside className="panel">
                  <div className="panel-heading">
                    <h3>Version history</h3>
                    <span className="mono">{app.versions.length}</span>
                  </div>
                  <div className="version-list">
                    {[...app.versions].reverse().map((version) => (
                      <button
                        className={`version-item ${selectedVersion?.id === version.id ? "current" : ""}`}
                        key={version.id}
                        onClick={() => setSelectedVersionId(version.id)}
                      >
                        <span className="version-number">
                          v{version.number}
                        </span>
                        <span>
                          <strong>
                            {version.presentation === "baseline"
                              ? "Original view"
                              : "Color-independent view"}
                          </strong>
                          <span className="muted">
                            {version.presentation === "baseline"
                              ? "Existing app"
                              : `Requested by ${version.requestedBy || "Claudia Barros"}`}
                          </span>
                        </span>
                        <span aria-hidden="true">
                          {selectedVersion?.id === version.id ? "●" : "○"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="panel-body">
                    <h3>Requests</h3>
                    {!events.length ? (
                      <p className="muted">
                        Requests appear here when a teammate uses or extends the
                        app.
                      </p>
                    ) : (
                      <div className="request-history">
                        {[...events]
                          .reverse()
                          .slice(0, 4)
                          .map((event, index) => (
                            <article
                              className="request-event"
                              key={`${event.at}-${index}`}
                            >
                              <div>
                                <strong>{event.person}</strong>
                                <span className="small-label">
                                  {event.action === "EXTEND"
                                    ? "Extended"
                                    : "Reused"}{" "}
                                  {event.versionId.endsWith("v2") ? "v2" : "v1"}
                                </span>
                              </div>
                              <p>{event.request}</p>
                            </article>
                          ))}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
        {view === "request" && (
          <>
            <div className="section-bar">
              <h2>Ask a teammate's app</h2>
              <span className="small-label">Halden & Reyes</span>
            </div>
            <div className="request-layout">
              <section className="composer-panel">
                <div className="panel-body">
                  <label className="field">
                    <span className="small-label">Teammate</span>
                    <select
                      className="input"
                      value={persona}
                      onChange={(event) => setPersona(event.target.value)}
                    >
                      <option>Claudia Barros</option>
                      <option>Jenna Liu</option>
                      <option>Priya Raghunathan</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="small-label">Request</span>
                    <textarea
                      className="request-box"
                      rows={5}
                      value={request}
                      onChange={(event) => {
                        setRequest(event.target.value);
                        setRoute(null);
                      }}
                      placeholder="I’m color-blind. Can you make the clash report easier to read?"
                    />
                  </label>
                  <div className="form-actions">
                    <span className="muted">
                      {persona.split(" ")[0]} · New conversation
                    </span>
                    <button
                      className="button primary"
                      disabled={!request.trim() || registryState !== "ready"}
                      onClick={checkRequest}
                    >
                      Find app <Arrow />
                    </button>
                  </div>
                  <div className="example-requests">
                    <span className="small-label">Example requests</span>
                    {examples.map((example) => (
                      <button
                        key={example}
                        onClick={() => {
                          setRequest(example);
                          setRoute(null);
                        }}
                      >
                        {example}
                        <Arrow />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <aside className="panel request-aside">
                <div className="panel-heading">
                  <h3>
                    {route?.action === "CLARIFY"
                      ? "Request result"
                      : route
                        ? "App found"
                        : "Available app"}
                  </h3>
                </div>
                <div className="panel-body">
                  {registryState !== "ready" ? (
                    <RegistryMatch />
                  ) : !route ? (
                    <>
                      <div className="matched-app">
                        <div className="app-glyph small" aria-hidden="true">
                          <i />
                          <i />
                        </div>
                        <div>
                          <strong>{app?.name}</strong>
                          <span className="muted">
                            v
                            {
                              app?.versions.find(
                                (version) =>
                                  version.id === app.currentVersionId,
                              )?.number
                            }{" "}
                            · Ready
                          </span>
                        </div>
                      </div>
                      <p>
                        Submit a request to check whether this app can handle
                        it.
                      </p>
                    </>
                  ) : (
                    <div className="route-result" aria-live="polite">
                      <span className="route-action">
                        {route.action === "EXTEND"
                          ? "Existing app · Extension needed"
                          : route.action === "REUSE"
                            ? "Existing app · Ready to use"
                            : "More information needed"}
                      </span>
                      <h2>{route.title}</h2>
                      <p>{route.reason}</p>
                      {app &&
                        (route.action === "EXTEND" ||
                          route.action === "REUSE") && (
                          <div className="matched-app">
                            <div className="app-glyph small" aria-hidden="true">
                              <i />
                              <i />
                            </div>
                            <div>
                              <strong>{app.name}</strong>
                              <span className="muted">
                                Requested by {persona}
                              </span>
                            </div>
                          </div>
                        )}
                      {route.action === "EXTEND" && (
                        <>
                          <div className="detail-grid">
                            <div>
                              <span className="small-label">Keep</span>
                              <p>Same model and clash results</p>
                            </div>
                            <div>
                              <span className="small-label">Add in v2</span>
                              <p>Labels, shapes and non-color markers</p>
                            </div>
                          </div>
                          <button
                            className="button primary full-width"
                            onClick={extendAndOpen}
                          >
                            Extend app & open v2 <Arrow />
                          </button>
                        </>
                      )}
                      {route.action === "REUSE" && app && (
                        <button
                          className="button primary full-width"
                          onClick={() =>
                            openVersion(
                              app.versions.find(
                                (version) => version.id === route.versionId,
                              ),
                            )
                          }
                        >
                          Open existing app <Arrow />
                        </button>
                      )}
                      {route.action === "CLARIFY" && (
                        <button
                          className="button secondary"
                          onClick={() => {
                            setRoute(null);
                            document
                              .querySelector<HTMLTextAreaElement>(
                                ".request-box",
                              )
                              ?.focus();
                          }}
                        >
                          Edit request
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
        <footer className="footer">
          <span>HRA sample history · Prepared patterns</span>
          <div>
            <span>Appstract</span>
            <button onClick={() => setModal({ kind: "reset" })}>
              Reset demo
            </button>
          </div>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal.kind === "json"
              ? "Source history"
              : modal.kind === "reset"
                ? "Reset demo?"
                : modal.kind === "snap"
                  ? `${modal.snap.sessionId} · turn ${modal.snap.turn}`
                  : modal.pattern.title
          }
          onClose={() => setModal(null)}
        >
          {modal.kind === "json" && (
            <pre className="json-view" tabIndex={0}>
              {getHistoryJson(modal.sourceId)}
            </pre>
          )}
          {modal.kind === "snap" && (
            <>
              <p className="caption muted">
                {modal.snap.speaker} · {modal.snap.sessionTitle} ·{" "}
                {modal.snap.atLabel}
              </p>
              <div className="md snap-full" tabIndex={0}>
                <Markdown text={modal.snap.text} />
              </div>
            </>
          )}
          {modal.kind === "brief" && (
            <>
              <p>{modal.pattern.outcome}</p>
              <div className="detail-grid">
                <div>
                  <span className="small-label">Input</span>
                  <p>{modal.pattern.input}</p>
                </div>
                <div>
                  <span className="small-label">Output</span>
                  <p>{modal.pattern.output}</p>
                </div>
              </div>
              <p className="muted">
                No app is available for this workflow yet.
              </p>
              <button
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Back to patterns
              </button>
            </>
          )}
          {modal.kind === "reset" && (
            <>
              <p>
                Clear this browser's requests and v2 extension. The existing
                clash app will still be available as v1.
              </p>
              <div className="modal-footer">
                <button
                  className="button secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    setApp(null);
                    appRef.current = null;
                    setEvents([]);
                    setAnalyzed(false);
                    setRequest("");
                    setRoute(null);
                    setSelectedVersionId("");
                    setModal(null);
                    navigate("history");
                    setRetry((value) => value + 1);
                  }}
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
