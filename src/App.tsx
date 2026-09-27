import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  sources,
  patterns as preparedPatterns,
  corpusStats,
  getHistoryJson,
  type Pattern,
} from "./data";
import {
  extendApp,
  routeRequest,
  buildLaunchUrl,
  validateApp,
  type AppRecord,
  type AppVersion,
} from "./domain";
import { discoverClashApp, mergeDiscoveredApp } from "./registry";
import { discoveryRequest, startDiscovery, getDiscovery } from "./discovery";
import type { DiscoveryJob } from "./discovery-types";
const DISCOVERY_KEY = "appstract-qm-discovery-job";
function savedDiscoveryId() {
  try {
    return sessionStorage.getItem(DISCOVERY_KEY) || "";
  } catch {
    return "";
  }
}
const isClashPattern = (pattern?: Pattern) =>
  pattern?.workflow === "clash-coordination" || pattern?.id === "clash";

type View = "history" | "patterns" | "apps" | "request";
type ModalKind =
  | { kind: "json"; sourceId: string }
  | { kind: "brief"; pattern: Pattern }
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
    return `${location.protocol}//${location.hostname}:${["4173", "4174"].includes(location.port) ? "4186" : "5186"}/`;
  return new URL("/apps/clash-detection/", location.origin).href;
}
function Arrow() {
  return (
    <span aria-hidden="true" className="arrow">
      →
    </span>
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
  const [selectedPatternId, setSelectedPatternId] = useState("clash");
  const [analyzed, setAnalyzed] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [analysisMode, setAnalysisMode] = useState<"qm" | "prepared">("qm");
  const [discoveryId, setDiscoveryId] = useState(savedDiscoveryId);
  const [discoveryJob, setDiscoveryJob] = useState<DiscoveryJob | null>(null);
  const [discoveryError, setDiscoveryError] = useState("");
  const [startingDiscovery, setStartingDiscovery] = useState(false);
  const [qmConnection, setQmConnection] = useState<{
    configured: boolean;
    error?: string;
  } | null>(null);
  const discoveryBusy = startingDiscovery || discoveryJob?.status === "running";
  const [app, setApp] = useState<AppRecord | null>(saved.app);
  const [events, setEvents] = useState<RequestEvent[]>(saved.events);
  const [selectedVersionId, setSelectedVersionId] = useState(
    saved.app?.currentVersionId || "",
  );
  const [sourceJson, setSourceJson] = useState("Loading QM history…");
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
  const visiblePatterns = patterns.filter((pattern) =>
    selectedSources.includes(pattern.sourceId),
  );
  const activePattern =
    visiblePatterns.find((pattern) => pattern.id === selectedPatternId) ||
    visiblePatterns[0];
  const selectedVersion =
    app?.versions.find((version) => version.id === selectedVersionId) ||
    app?.versions.find((version) => version.id === app.currentVersionId);

  useEffect(() => {
    discoveryRequest<{ configured: boolean; error?: string }>("status")
      .then(setQmConnection)
      .catch(() =>
        setQmConnection({
          configured: false,
          error: "The QM discovery server is unavailable.",
        }),
      );
  }, []);
  useEffect(() => {
    if (!discoveryId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const job = await getDiscovery(discoveryId);
        if (disposed) return;
        setDiscoveryJob(job);
        setSelectedSources(job.sourceIds);
        if (job.status === "complete") {
          setPatterns(job.patterns);
          setAnalyzed(true);
          setSelectedPatternId(job.patterns[0]?.id || "");
        } else if (job.status === "failed") {
          setDiscoveryError(job.error || "QM discovery failed.");
        } else {
          timer = setTimeout(poll, 1500);
        }
      } catch (error) {
        if (disposed) return;
        setDiscoveryError(
          error instanceof Error ? error.message : "Could not load QM results.",
        );
        // Keep the run ID. Reconnecting resumes the same run without paying for another analysis.
        setDiscoveryJob((current) =>
          current?.status === "running"
            ? { ...current, status: "failed" }
            : current,
        );
      }
    }
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [discoveryId, retry]);
  useEffect(() => {
    if (modal?.kind !== "json" || analysisMode !== "qm") return;
    let active = true;
    setSourceJson("Reading synthetic history from QM…");
    discoveryRequest(`history/${encodeURIComponent(modal.sourceId)}`)
      .then(value => { if (active) setSourceJson(JSON.stringify(value, null, 2)); })
      .catch(error => { if (active) setSourceJson(error instanceof Error ? error.message : "QM history unavailable."); });
    return () => { active = false; };
  }, [modal, analysisMode]);
  async function findPatterns() {
    if (discoveryBusy) return;
    setStartingDiscovery(true);
    setDiscoveryError("");
    setAnalyzed(false);
    setPatterns([]);
    setDiscoveryId("");
    setDiscoveryJob(null);
    setAnalysisMode("qm");
    try {
      sessionStorage.removeItem(DISCOVERY_KEY);
    } catch {
      /* optional resume */
    }
    navigate("patterns");
    try {
      const job = await startDiscovery(selectedSources);
      setDiscoveryJob(job);
      setDiscoveryId(job.id);
      try {
        sessionStorage.setItem(DISCOVERY_KEY, job.id);
      } catch {
        /* discovery still works */
      }
    } catch (error) {
      setDiscoveryError(
        error instanceof Error
          ? error.message
          : "Could not start QM discovery.",
      );
    } finally {
      setStartingDiscovery(false);
    }
  }
  function showPreparedPatterns() {
    setDiscoveryId("");
    setDiscoveryJob(null);
    setDiscoveryError("");
    try {
      sessionStorage.removeItem(DISCOVERY_KEY);
    } catch {
      /* optional resume */
    }
    setAnalysisMode("prepared");
    setPatterns(preparedPatterns);
    setAnalyzed(true);
    setSelectedPatternId("clash");
    navigate("patterns");
  }
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
    (view === "patterns" && analyzed && isClashPattern(activePattern));
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
    const person =
      view === "patterns"
        ? sources.find((source) => source.id === activePattern?.sourceId)
            ?.name || "Teammate"
        : persona;
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
                    disabled={discoveryBusy}
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
                          disabled={discoveryBusy}
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
                    disabled={
                      !selectedSources.length ||
                      discoveryBusy ||
                      !qmConnection?.configured
                    }
                    onClick={findPatterns}
                  >
                    {discoveryBusy ? "Reading histories…" : "Find patterns"}{" "}
                    <Arrow />
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
                  QM is a connected history source. Appstract reads the synthetic
                  conversations and shows saved analysis, checked against the live
                  history. Each pattern cites at least two sessions.
                </p>
                <p className="caption" role="status">
                  {qmConnection === null
                    ? "Checking QM connection…"
                    : qmConnection.configured
                      ? "QM connected · synthetic demo histories"
                      : "QM not connected"}
                </p>
                {!qmConnection?.configured && qmConnection?.error && (
                  <p className="caption muted">{qmConnection.error}</p>
                )}
                <button
                  className="button secondary"
                  disabled={!selectedSources.length || discoveryBusy}
                  onClick={showPreparedPatterns}
                >
                  View prepared examples
                </button>
              </aside>
            </div>
          </>
        )}
        {view === "patterns" && (
          <>
            <div className="section-bar">
              <h2>
                {analyzed ? visiblePatterns.length : 0} recurring workflows
              </h2>
              <span className="small-label">
                {analysisMode === "qm" ? "Source: QM" : "Prepared examples"}
              </span>
            </div>
            {analysisMode === "qm" &&
              (discoveryBusy || discoveryError || discoveryJob) && (
                <div
                  className="discovery-status"
                  role={discoveryError ? "alert" : "status"}
                >
                  <p>
                    {discoveryError ||
                      (discoveryBusy
                        ? `Appstract is preparing analysis from QM. ${discoveryJob?.completedSources || 0} of ${discoveryJob?.totalSources || selectedSources.length} histories ready.`
                        : `Analyzed ${discoveryJob?.completedSources} ${discoveryJob?.completedSources === 1 ? "history" : "histories"} from QM. Saved Appstract analysis, verified against live conversations.`)}
                  </p>
                  {discoveryBusy && (
                    <p className="caption muted">
                      This can take several minutes. You can leave this view;
                      the local demo is finishing its saved analysis.
                    </p>
                  )}
                  {discoveryJob?.readAt && (
                    <p className="caption muted">
                      Read from QM {new Date(discoveryJob.readAt).toLocaleTimeString()}.
                      {discoveryJob.analyzedAt && ` Analysis saved ${new Date(discoveryJob.analyzedAt).toLocaleString()}.`}
                    </p>
                  )}
                  {discoveryError && discoveryId && (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setDiscoveryError("");
                        setRetry((value) => value + 1);
                      }}
                    >
                      Reload run status
                    </button>
                  )}
                </div>
              )}
            {!analyzed || !activePattern ? (
              <div className="empty-state">
                <h2>
                  {discoveryBusy
                    ? "Finding recurring work…"
                    : discoveryError
                      ? "Discovery could not finish"
                      : analyzed
                        ? "No recurring workflows found"
                        : "Select a history first"}
                </h2>
                <button
                  className="button primary"
                  onClick={() => navigate("history")}
                >
                  Choose histories <Arrow />
                </button>
              </div>
            ) : (
              <div className="patterns-layout">
                <section className="pattern-list" aria-label="Patterns">
                  <div className="panel-heading">
                    <span className="small-label">Pattern</span>
                    <span className="small-label">Recurrence</span>
                  </div>
                  {visiblePatterns.map((pattern) => (
                    <button
                      className={`pattern-card ${activePattern.id === pattern.id ? "selected" : ""}`}
                      key={pattern.id}
                      onClick={() => setSelectedPatternId(pattern.id)}
                      aria-pressed={activePattern.id === pattern.id}
                    >
                      <span className="pattern-number">{String(pattern.rank).padStart(2, "0")}</span>
                      <span className="pattern-content">
                        <span className="small-label">{pattern.category}</span>
                        <strong>{pattern.title}</strong>
                        <span className="muted">{pattern.description}</span>
                        <span className="pattern-metrics">
                          <span className="mono">
                            {pattern.sessionIds.length} sessions
                          </span>
                          <span>1 requester</span>
                        </span>
                      </span>
                      <Arrow />
                    </button>
                  ))}
                </section>
                <aside className="evidence-panel">
                  <div className="panel-heading">
                    <h3>{activePattern.title}</h3>
                  </div>
                  <div className="panel-body">
                    {isClashPattern(activePattern) && <RegistryMatch />}
                    <div className="metrics-row">
                      <div>
                        <strong>{activePattern.sessionIds.length}</strong>
                        <span>Recurring sessions</span>
                      </div>
                      <div>
                        <strong>1</strong>
                        <span>Requester</span>
                      </div>
                    </div>
                    <h3>Source requests</h3>
                    {activePattern.evidence.slice(0, 3).map((evidence) => (
                      <article className="evidence-card" key={evidence.id}>
                        <div className="evidence-meta">
                          <strong>{evidence.author.split(" ")[0]}</strong>
                          <span className="mono">
                            {evidence.sessionId} · {evidence.date}
                          </span>
                        </div>
                        <blockquote className="quote">
                          “{evidence.quote}”
                        </blockquote>
                      </article>
                    ))}
                    <details className="pattern-scope">
                      <summary>Workflow details</summary>
                      <div className="detail-grid">
                        <div>
                          <span className="small-label">Input</span>
                          <p>{activePattern.input}</p>
                        </div>
                        <div>
                          <span className="small-label">Output</span>
                          <p>{activePattern.output}</p>
                        </div>
                      </div>
                      {isClashPattern(activePattern) && (
                        <p className="caption muted">
                          The existing app checks sample geometry. It does not
                          import or group Navisworks exports.
                        </p>
                      )}
                    </details>
                    {!isClashPattern(activePattern) && (
                      <button
                        className="button secondary full-width"
                        onClick={() =>
                          setModal({ kind: "brief", pattern: activePattern })
                        }
                      >
                        View proposed app <Arrow />
                      </button>
                    )}
                  </div>
                </aside>
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
          <span>
            HRA sample history ·{" "}
            {analysisMode === "qm" ? "Source: QM" : "Prepared examples"}
          </span>
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
                : modal.pattern.title
          }
          onClose={() => setModal(null)}
        >
          {modal.kind === "json" && (
            <pre className="json-view" tabIndex={0}>
              {analysisMode === "qm" ? sourceJson : getHistoryJson(modal.sourceId)}
            </pre>
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
                  disabled={discoveryBusy}
                  onClick={() => {
                    setApp(null);
                    appRef.current = null;
                    setEvents([]);
                    setAnalyzed(false);
                    setPatterns([]);
                    setDiscoveryId("");
                    setDiscoveryJob(null);
                    setDiscoveryError("");
                    try {
                      sessionStorage.removeItem(DISCOVERY_KEY);
                    } catch {
                      /* optional resume */
                    }
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
