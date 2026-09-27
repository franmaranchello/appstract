import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  sources,
  patterns,
  corpusStats,
  getHistoryJson,
  type Pattern,
} from "./data";
import {
  createDemoApp,
  extendApp,
  routeRequest,
  buildLaunchUrl,
  validateApp,
  type AppRecord,
} from "./domain";

type View = "history" | "patterns" | "apps" | "request";
type ModalKind =
  | { kind: "json"; sourceId: string }
  | { kind: "brief"; pattern: Pattern }
  | { kind: "connect" }
  | { kind: "reset" }
  | null;
const STORAGE_KEY = "appstract-mockup-v1";
function loadSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { app: validateApp(value.app), analyzed: value.analyzed === true };
  } catch {
    return { app: null, analyzed: false };
  }
}
const saved = loadSaved();
const examples = [
  "Run a clash check on the sample model.",
  "Run the clash check with color-blind-friendly labels and shapes.",
  "Group this Navisworks XML export into issues.",
];
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span aria-hidden="true" className="arrow">
      {diagonal ? "↗" : "→"}
    </span>
  );
}
function GeometricArt() {
  return (
    <div className="intro-art" aria-hidden="true">
      <div className="art-blue" />
      <div className="art-red" />
      <div className="art-yellow" />
      <span className="art-caption mono">RECOGNIZE. REUSE. REPEAT.</span>
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
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
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
  const [view, setView] = useState<View>("history");
  const [selectedSources, setSelectedSources] = useState(
    sources.map((source) => source.id),
  );
  const [selectedPatternId, setSelectedPatternId] = useState("clash");
  const [analyzed, setAnalyzed] = useState(saved.analyzed);
  const [app, setApp] = useState<AppRecord | null>(saved.app);
  const [selectedVersionId, setSelectedVersionId] = useState(
    saved.app?.currentVersionId || "",
  );
  const [modal, setModal] = useState<ModalKind>(null);
  const [request, setRequest] = useState("");
  const [persona, setPersona] = useState("Claudia Barros");
  const [route, setRoute] = useState<ReturnType<typeof routeRequest> | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState("");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ app, analyzed }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [app, analyzed]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const selected = sources.filter((source) =>
    selectedSources.includes(source.id),
  );
  const visiblePatterns = patterns.filter((pattern) =>
    selectedSources.includes(pattern.sourceId),
  );
  const activePattern =
    visiblePatterns.find((pattern) => pattern.id === selectedPatternId) ||
    visiblePatterns[0];
  const selectedVersion =
    app?.versions.find((version) => version.id === selectedVersionId) ||
    app?.versions.find((version) => version.id === app.currentVersionId);
  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0 });
    window.setTimeout(() => titleRef.current?.focus(), 0);
  };
  const notify = (message: string) => setToast(message);
  function registerApp() {
    if (app) {
      setModal(null);
      navigate("apps");
      return;
    }
    const next = createDemoApp(
      request ||
        "Create a reusable clash review app from the selected demo brief.",
    );
    if (import.meta.env.VITE_DEMO_APP_URL)
      next.url = import.meta.env.VITE_DEMO_APP_URL;
    setApp(next);
    setSelectedVersionId(next.currentVersionId);
    setModal(null);
    navigate("apps");
    notify("Clash review app added to your catalog.");
  }
  function connectApp() {
    setUrlDraft(app?.url || "");
    setUrlError("");
    setModal({ kind: "connect" });
  }
  function openApp() {
    if (!app || !selectedVersion) return;
    const url = buildLaunchUrl(app, selectedVersion);
    if (!url) {
      connectApp();
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    notify(
      `${app.name} ${selectedVersion.number === 1 ? "v1" : "v2"} opened in a new tab.`,
    );
  }
  function saveUrl() {
    if (!app || !selectedVersion) return;
    const next = { ...app, url: urlDraft.trim() };
    if (!buildLaunchUrl(next, selectedVersion)) {
      setUrlError(
        "Use an HTTPS URL, or an HTTP localhost URL for a local preview.",
      );
      return;
    }
    setApp(next);
    setModal(null);
    notify("App preview URL saved.");
  }
  function approveExtension() {
    if (!app) return;
    const next = extendApp(app, request);
    setApp(next);
    setSelectedVersionId(next.currentVersionId);
    setRoute(null);
    navigate("apps");
    notify("v2 configuration added. Your original version is still available.");
  }
  function showBrief(pattern: Pattern) {
    setModal({ kind: "brief", pattern });
  }
  const pageInfo = {
    history: [
      "01 / YOUR ORGANIZATION",
      "GOOD WORK.\nWORTH REPEATING.",
      "Your team has already solved the next problem. Find the work worth turning into an app.",
    ],
    patterns: [
      "02 / OPPORTUNITIES",
      "THE PATTERN\nIS THE START.",
      "Repeated asks. Familiar workarounds. A clearer picture of what your team needs next.",
    ],
    apps: [
      "03 / YOUR APP LIBRARY",
      "BUILT ONCE.\nBETTER TOGETHER.",
      "Useful work stays with your organization. Every request gets a head start.",
    ],
    request: [
      "A NEW CONVERSATION",
      "A NEW ASK.\nA HEAD START.",
      "Start with what your team already knows. Reuse an app, or give it a new capability.",
    ],
  }[view];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate("history")}
          aria-label="Appstract home"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
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
        <div className="org-switch">
          <span className="status-dot" />
          HRA<span className="muted"> / </span>Workspace
        </div>
        <button
          className={`button primary new-request ${view === "request" ? "is-current" : ""}`}
          onClick={() => {
            setRoute(null);
            navigate("request");
          }}
        >
          New request <span aria-hidden="true">＋</span>
        </button>
      </header>
      <main id="main-content" className="workspace">
        <section className="page-intro">
          <div>
            <p className="eyebrow">
              <span className="tiny-square" />
              {pageInfo[0]}
            </p>
            <h1 className="page-title" ref={titleRef} tabIndex={-1}>
              {pageInfo[1]}
            </h1>
            <p className="lead">{pageInfo[2]}</p>
          </div>
          <GeometricArt />
        </section>
        {storageError && (
          <div role="alert" className="notice">
            Browser storage is unavailable. Your work will remain in this tab,
            but will not survive a reload.
          </div>
        )}
        {view === "history" && (
          <>
            <div className="section-bar">
              <h2>Organization archive</h2>
              <span className="small-label">
                <span className="status-dot" />
                Synthetic HRA dataset
              </span>
            </div>
            <div className="history-layout">
              <section className="sources-panel" aria-labelledby="source-title">
                <div className="panel-heading">
                  <div>
                    <span className="small-label">
                      Start with the conversations
                    </span>
                    <h3 id="source-title">
                      Four perspectives. One organization.
                    </h3>
                  </div>
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
                  {sources.map((source, index) => (
                    <div
                      className={`source-row ${selectedSources.includes(source.id) ? "is-selected" : ""}`}
                      key={source.id}
                    >
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
                            0{index + 1} / {source.department}
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
                        aria-label={`View ${source.name}'s JSON`}
                        onClick={() =>
                          setModal({ kind: "json", sourceId: source.id })
                        }
                      >
                        <span aria-hidden="true">↗</span>
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
                      conversations selected
                    </strong>
                    <span className="muted">March – September 2026</span>
                  </div>
                  <button
                    className="button primary"
                    disabled={selectedSources.length === 0}
                    onClick={() => {
                      setAnalyzed(true);
                      setSelectedPatternId(visiblePatterns[0]?.id || "clash");
                      navigate("patterns");
                    }}
                  >
                    Find patterns <Arrow />
                  </button>
                </div>
              </section>
              <aside className="history-aside">
                <div className="aside-heading">
                  <span className="small-label">The bigger picture</span>
                  <h2>
                    FROM REPEATED
                    <br />
                    TO REUSABLE.
                  </h2>
                </div>
                <div className="summary-grid">
                  <div className="stat">
                    <strong>
                      {corpusStats.people.toString().padStart(2, "0")}
                    </strong>
                    <span>Team members</span>
                  </div>
                  <div className="stat">
                    <strong>{corpusStats.sessions}</strong>
                    <span>Conversations</span>
                  </div>
                  <div className="stat wide">
                    <strong>{corpusStats.turns.toLocaleString()}</strong>
                    <span>Messages worth learning from</span>
                  </div>
                </div>
                <div className="flow-steps">
                  <div className="flow-step">
                    <span>01</span>
                    <p>Spot the repeat work</p>
                  </div>
                  <div className="flow-step">
                    <span>02</span>
                    <p>Keep the useful knowledge</p>
                  </div>
                  <div className="flow-step">
                    <span>03</span>
                    <p>Turn it into a shared app</p>
                  </div>
                </div>
                <p className="caption muted">
                  Prepared analysis of the supplied histories. Source excerpts
                  stay attached to every opportunity.
                </p>
              </aside>
            </div>
          </>
        )}
        {view === "patterns" && (
          <>
            <div className="section-bar">
              <h2>
                Work worth building for{" "}
                <span className="count-tag">
                  {analyzed
                    ? visiblePatterns.length.toString().padStart(2, "0")
                    : "00"}
                </span>
              </h2>
              <span className="small-label">
                Prepared analysis · source-backed excerpts
              </span>
            </div>
            {!analyzed || !activePattern ? (
              <div className="empty-state">
                <span className="empty-glyph" aria-hidden="true">
                  ↗
                </span>
                <h2>Start with your team's history.</h2>
                <p>Select a history to explore the repeated work inside it.</p>
                <button
                  className="button primary"
                  onClick={() => navigate("history")}
                >
                  Choose histories <Arrow />
                </button>
              </div>
            ) : (
              <div className="patterns-layout">
                <section
                  className="pattern-list"
                  aria-label="Suggested app opportunities"
                >
                  <div className="panel-heading">
                    <span className="small-label">
                      Opportunity / recurring sessions
                    </span>
                    <span className="mono">{visiblePatterns.length} found</span>
                  </div>
                  {visiblePatterns.map((pattern) => (
                    <button
                      key={pattern.id}
                      className={`pattern-card ${activePattern.id === pattern.id ? "selected" : ""}`}
                      onClick={() => setSelectedPatternId(pattern.id)}
                      aria-pressed={activePattern.id === pattern.id}
                    >
                      <span className="pattern-number">
                        {pattern.rank.toString().padStart(2, "0")}
                      </span>
                      <span className="pattern-content">
                        <span className="small-label">{pattern.category}</span>
                        <strong>{pattern.title}</strong>
                        <span className="muted">{pattern.description}</span>
                        <span className="pattern-metrics">
                          <span className="mono">
                            {pattern.sessionIds.length} recurring sessions
                          </span>
                          <span>1 teammate</span>
                        </span>
                      </span>
                      <span className="pattern-end">
                        <span
                          className="signal-bars"
                          aria-label={`${pattern.sessionIds.length} selected evidence sessions`}
                        >
                          {[0, 1, 2, 3, 4].map((i) => (
                            <i
                              key={i}
                              className={
                                i <
                                Math.min(
                                  5,
                                  Math.ceil(pattern.sessionIds.length / 3),
                                )
                                  ? "filled"
                                  : ""
                              }
                            />
                          ))}
                        </span>
                        <Arrow />
                      </span>
                    </button>
                  ))}
                  <div className="list-note">
                    <span className="small-label">A signal, not a guess</span>
                    <p>
                      Repeated sessions count once per task. Follow-up messages
                      and assistant replies don't inflate the signal.
                    </p>
                  </div>
                </section>
                <aside className="evidence-panel">
                  <div className="panel-heading">
                    <span className="small-label">Inside the pattern</span>
                    <span className="tag">Evidence</span>
                  </div>
                  <div className="panel-body">
                    <h2>{activePattern.title}</h2>
                    <p className="muted">{activePattern.outcome}</p>
                    <div className="metrics-row">
                      <div>
                        <strong>{activePattern.sessionIds.length}</strong>
                        <span>Recurring sessions</span>
                      </div>
                      <div>
                        <strong>01</strong>
                        <span>Requester</span>
                      </div>
                    </div>
                    <div className="signal-list">
                      {activePattern.signals.map((signal) => (
                        <span key={signal}>
                          <span aria-hidden="true">↗</span>
                          {signal}
                        </span>
                      ))}
                    </div>
                    <div className="evidence-heading">
                      <h3>In their own words</h3>
                      <span className="mono">SOURCE EXCERPTS</span>
                    </div>
                    {activePattern.evidence.slice(0, 3).map((evidence) => (
                      <article className="evidence-card" key={evidence.id}>
                        <div className="evidence-meta">
                          <strong>{evidence.author.split(" ")[0]}</strong>
                          <span className="mono">
                            {evidence.sessionId} ·{" "}
                            {new Date(evidence.date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </div>
                        <blockquote className="quote">
                          “{evidence.quote}”
                        </blockquote>
                      </article>
                    ))}
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="small-label">Input</span>
                        <p>{activePattern.input}</p>
                      </div>
                      <div className="detail-item">
                        <span className="small-label">Output</span>
                        <p>{activePattern.output}</p>
                      </div>
                    </div>
                    <button
                      className="button primary full-width"
                      onClick={() => showBrief(activePattern)}
                    >
                      Review app brief <Arrow />
                    </button>
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
        {view === "apps" && (
          <>
            <div className="section-bar">
              <h2>
                Your organization's apps{" "}
                <span className="count-tag">{app ? "01" : "00"}</span>
              </h2>
              <span className="small-label">Knowledge that gets used</span>
            </div>
            {!app ? (
              <div className="empty-state">
                <div className="empty-glyph" aria-hidden="true">
                  ＋
                </div>
                <span className="small-label">
                  Every library starts somewhere
                </span>
                <h2>Your first app starts with a pattern.</h2>
                <p>
                  Turn a repeated request into something the whole team can use.
                </p>
                <button
                  className="button primary"
                  onClick={() => navigate(analyzed ? "patterns" : "history")}
                >
                  Explore opportunities <Arrow />
                </button>
              </div>
            ) : (
              <div className="apps-layout">
                <section className="app-card">
                  <div className="app-card-top">
                    <div className="app-glyph" aria-hidden="true">
                      <i />
                      <i />
                    </div>
                    <span className="tag">Prepared demo app</span>
                  </div>
                  <span className="small-label">COORDINATION / SHARED APP</span>
                  <h2>{app.name}</h2>
                  <p>
                    Review a sample model's clashes. Keep the same analysis, and
                    make the results easier for everyone to read.
                  </p>
                  <div className="app-version-display">
                    <span className="version-badge">
                      v{selectedVersion?.number}
                    </span>
                    <div>
                      <strong>
                        {selectedVersion?.presentation === "non-color"
                          ? "Color-independent review"
                          : "Baseline review"}
                      </strong>
                      <span className="muted">
                        {selectedVersion?.presentation === "non-color"
                          ? "Labels, distinct shapes & non-color encoding"
                          : "Sample clash report & readable results"}
                      </span>
                    </div>
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="small-label">Owned by</span>
                      <p>Halden & Reyes Architects</p>
                    </div>
                    <div className="detail-item">
                      <span className="small-label">Execution</span>
                      <p>Separate app repository</p>
                    </div>
                  </div>
                  <div className="action-bar">
                    <button className="button primary" onClick={openApp}>
                      Open app <Arrow diagonal />
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setRequest(examples[1]);
                        setRoute(null);
                        navigate("request");
                      }}
                    >
                      Extend this app <span aria-hidden="true">＋</span>
                    </button>
                  </div>
                  <div className="integration-line">
                    <span
                      className={`status-dot ${app.url ? "" : "inactive"}`}
                    />
                    <span>
                      {app.url
                        ? "App preview URL configured"
                        : "Connect your teammate’s app preview"}
                    </span>
                    <button className="text-button" onClick={connectApp}>
                      {app.url ? "Edit URL" : "Connect"}
                    </button>
                  </div>
                </section>
                <aside className="panel">
                  <div className="panel-heading">
                    <h3>One app. A growing history.</h3>
                    <span className="mono">
                      {app.versions.length.toString().padStart(2, "0")}
                    </span>
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
                              ? "First shared version"
                              : "A clearer way to see"}
                          </strong>
                          <span className="muted">
                            {version.presentation === "baseline"
                              ? "Prepared app registered"
                              : "Presentation configuration extended"}
                          </span>
                          <span className="mono">
                            {new Date(version.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </span>
                        <span aria-hidden="true">
                          {selectedVersion?.id === version.id ? "●" : "○"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="panel-body">
                    <span className="small-label">The reason it exists</span>
                    <p>
                      Priya keeps recreating clash-coordination work across
                      conversations. This sample review app is the team's chosen
                      demo direction.
                    </p>
                    <button
                      className="button ghost"
                      onClick={() => {
                        setSelectedSources(sources.map((source) => source.id));
                        setAnalyzed(true);
                        setSelectedPatternId("clash");
                        navigate("patterns");
                      }}
                    >
                      See source evidence <Arrow />
                    </button>
                    <div className="callout">
                      <strong>Useful work stays useful.</strong>
                      <p>
                        New requests build on the same app. Previous versions
                        stay in reach.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
        {view === "request" && (
          <>
            <div className="section-bar">
              <h2>Ask your organization</h2>
              <span className="small-label">
                Demo routing · local app catalog
              </span>
            </div>
            <div className="request-layout">
              <section className="composer-panel">
                <div className="panel-heading">
                  <span className="small-label">A fresh request</span>
                  <span className="tag">New conversation</span>
                </div>
                <div className="panel-body">
                  <label className="field">
                    <span className="small-label">Demo teammate</span>
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
                    <span className="small-label">What do you need to do?</span>
                    <textarea
                      className="request-box"
                      value={request}
                      onChange={(event) => {
                        setRequest(event.target.value);
                        setRoute(null);
                      }}
                      placeholder="Run the clash check, but make the results easier to read without relying on color…"
                      rows={5}
                    />
                  </label>
                  <div className="form-actions">
                    <span className="muted">
                      {persona.split(" ")[0]}'s request · HRA
                    </span>
                    <button
                      className="button primary"
                      disabled={!request.trim()}
                      onClick={() => setRoute(routeRequest(request, app))}
                    >
                      Find the right app <Arrow />
                    </button>
                  </div>
                  <div className="example-requests">
                    <span className="small-label">Try a request</span>
                    {examples.map((example, index) => (
                      <button
                        key={example}
                        onClick={() => {
                          setRequest(example);
                          setRoute(null);
                        }}
                      >
                        <span className="mono">0{index + 1}</span>
                        {example}
                        <Arrow />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <aside className="panel request-aside">
                <div className="panel-heading">
                  <span className="small-label">The next step</span>
                  <span className="mono">↗</span>
                </div>
                {!route ? (
                  <div className="panel-body">
                    <div className="routing-glyph" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <h2>
                      Start with what
                      <br />
                      already exists.
                    </h2>
                    <p className="muted">
                      A familiar task finds its app. A new requirement adds a
                      capability. The knowledge carries forward.
                    </p>
                    <div className="flow-step">
                      <span>01</span>
                      <p>Find a relevant app</p>
                    </div>
                    <div className="flow-step">
                      <span>02</span>
                      <p>Check what it can do</p>
                    </div>
                    <div className="flow-step">
                      <span>03</span>
                      <p>Reuse or extend</p>
                    </div>
                  </div>
                ) : (
                  <div className="panel-body route-result" aria-live="polite">
                    <span className="route-action">{route.action}</span>
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
                            <span className="mono">
                              EXISTING APP / SAVED VERSION
                            </span>
                          </div>
                        </div>
                      )}
                    {route.action === "EXTEND" && (
                      <>
                        <div className="detail-grid">
                          <div>
                            <span className="small-label">Keep</span>
                            <p>App identity & sample computation</p>
                          </div>
                          <div>
                            <span className="small-label">Add</span>
                            <p>Labels, shapes & non-color encoding</p>
                          </div>
                        </div>
                        <button
                          className="button primary full-width"
                          onClick={approveExtension}
                        >
                          Create v2 configuration <Arrow />
                        </button>
                        <p className="caption muted">
                          Configuration extension in this mockup. No code
                          generation is running.
                        </p>
                      </>
                    )}
                    {route.action === "REUSE" && (
                      <button
                        className="button primary full-width"
                        onClick={() => {
                          setSelectedVersionId(
                            route.versionId || app?.currentVersionId || "",
                          );
                          navigate("apps");
                        }}
                      >
                        Use existing version <Arrow />
                      </button>
                    )}
                    {route.action === "CREATE" && (
                      <button
                        className="button primary full-width"
                        onClick={() =>
                          showBrief(
                            patterns.find((pattern) => pattern.id === "clash")!,
                          )
                        }
                      >
                        Review demo app brief <Arrow />
                      </button>
                    )}
                    {route.action === "CLARIFY" && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          setRoute(null);
                          document
                            .querySelector<HTMLTextAreaElement>(".request-box")
                            ?.focus();
                        }}
                      >
                        Refine request <Arrow />
                      </button>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
        <footer className="footer">
          <span>
            APPSTRACT <span className="muted">/</span> YOUR ORGANIZATION,
            COMPOUNDING.
          </span>
          <div>
            <span className="status-dot inactive" />
            <span>Interactive mockup</span>
            <span className="footer-separator">/</span>
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
              ? "Source history / JSON"
              : modal.kind === "brief"
                ? "A brief for your next app"
                : modal.kind === "connect"
                  ? "Connect the app preview"
                  : "Start a fresh demo"
          }
          onClose={() => setModal(null)}
        >
          {modal.kind === "json" && (
            <>
              <p className="muted">
                Original synthetic history, exactly as supplied in the
                repository.
              </p>
              <pre className="json-view" tabIndex={0}>
                {getHistoryJson(modal.sourceId)}
              </pre>
            </>
          )}
          {modal.kind === "brief" && (
            <>
              <span className="small-label">
                From a pattern to a possibility
              </span>
              <h3 className="brief-title">{modal.pattern.title}</h3>
              <p>{modal.pattern.outcome}</p>
              <div className="brief-grid">
                <div>
                  <span className="small-label">Evidence</span>
                  <p>
                    {modal.pattern.sessionIds.length} recurring sessions
                    <br />1 requester
                  </p>
                </div>
                <div>
                  <span className="small-label">Proposed input</span>
                  <p>{modal.pattern.input}</p>
                </div>
                <div>
                  <span className="small-label">Proposed output</span>
                  <p>{modal.pattern.output}</p>
                </div>
              </div>
              {modal.pattern.id === "clash" ? (
                <>
                  <div className="scope-note">
                    <span className="small-label">
                      Team-selected demo direction
                    </span>
                    <h3>Clash review app</h3>
                    <p>
                      The history asks for exported issue triage. For this demo,
                      the team is building a separate app that reviews sample
                      geometry. Its input is a sample model, not a Navisworks
                      XML export.
                    </p>
                  </div>
                  <p className="caption muted">
                    This mockup adds a prepared app to the catalog. Its sample
                    computation and result UI live in your teammate's
                    repository.
                  </p>
                  <div className="modal-footer">
                    <button
                      className="button secondary"
                      onClick={() => setModal(null)}
                    >
                      Keep exploring
                    </button>
                    <button className="button primary" onClick={registerApp}>
                      {app ? "View existing app" : "Add demo app"} <Arrow />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="notice">
                    This opportunity is available to explore. The hackathon's
                    executable demo focuses on the clash review app.
                  </div>
                  <div className="modal-footer">
                    <button
                      className="button secondary"
                      onClick={() => setModal(null)}
                    >
                      Back to evidence
                    </button>
                    <button
                      className="button primary"
                      onClick={() => {
                        setShortlist((current) =>
                          current.includes(modal.pattern.id)
                            ? current
                            : [...current, modal.pattern.id],
                        );
                        setModal(null);
                        notify(
                          "Opportunity saved to this session’s shortlist.",
                        );
                      }}
                    >
                      {shortlist.includes(modal.pattern.id)
                        ? "Saved to shortlist"
                        : "Save opportunity"}{" "}
                      <Arrow />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {modal.kind === "connect" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveUrl();
              }}
            >
              <p>
                Paste the URL served by the separate clash app. Appstract will
                pass the selected app version, sample fixture and presentation
                mode.
              </p>
              <label className="field">
                <span className="small-label">App preview URL</span>
                <input
                  className="input"
                  type="url"
                  placeholder="http://localhost:5174"
                  value={urlDraft}
                  onChange={(event) => {
                    setUrlDraft(event.target.value);
                    setUrlError("");
                  }}
                  required
                  autoFocus
                />
              </label>
              {urlError && (
                <p role="alert" className="error-text">
                  {urlError}
                </p>
              )}
              <p className="caption muted">
                QM and GBrain are not connected in this UI mockup. The local
                catalog powers the demo flow.
              </p>
              <div className="modal-footer">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button className="button primary" type="submit">
                  Save connection <Arrow />
                </button>
              </div>
            </form>
          )}
          {modal.kind === "reset" && (
            <>
              <p>
                Clear this browser's demo app and versions. The supplied source
                histories stay available.
              </p>
              <div className="modal-footer">
                <button
                  className="button secondary"
                  onClick={() => setModal(null)}
                >
                  Keep my demo
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    setApp(null);
                    setAnalyzed(false);
                    setRoute(null);
                    setRequest("");
                    setSelectedSources(sources.map((source) => source.id));
                    setShortlist([]);
                    setModal(null);
                    navigate("history");
                    notify("Demo reset. Ready for a fresh start.");
                  }}
                >
                  Reset demo <Arrow />
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
