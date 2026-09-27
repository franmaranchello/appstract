import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  sources,
  patterns,
  corpusStats,
  getHistoryJson,
  type Pattern,
} from "./data";
import {
  extendApp,
  routeRequest,
  buildLaunchUrl,
  type AppRecord,
  type AppVersion,
} from "./domain";
import { discoverApp, mergeDiscoveredApp } from "./registry";
import { appCatalog, requestAppKind, type AppKind } from "./catalog";
import { loadSaved, STORAGE_KEY, type RequestEvent } from "./storage";

type View = "history" | "patterns" | "apps" | "request";
type ModalKind =
  | { kind: "json"; sourceId: string }
  | { kind: "brief"; pattern: Pattern }
  | { kind: "reset" }
  | null;
const saved = loadSaved();
const initialView = (): View =>
  ["history", "patterns", "apps", "request"].includes(location.hash.slice(1))
    ? (location.hash.slice(1) as View)
    : "history";
const examples = [
  "Run the clash check on the sample model.",
  "I’m color-blind. Can you make the same tool easier to read with labels and shapes?",
  "Review vendor documents and security checks for approval.",
  "Group this Navisworks XML export into issues.",
];
function appBaseUrl(kind: AppKind) {
  if (kind === "vendor")
    return new URL("/apps/vendor-approval/", location.origin).href;
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
  const [analyzed, setAnalyzed] = useState(saved.analyzed);
  const [apps, setApps] = useState(saved.apps);
  const [activeKind, setActiveKind] = useState<AppKind>(saved.activeKind);
  const [events, setEvents] = useState<RequestEvent[]>(saved.events);
  const [selectedVersionId, setSelectedVersionId] = useState(
    saved.apps[saved.activeKind]?.currentVersionId || "",
  );
  const [modal, setModal] = useState<ModalKind>(null);
  const [request, setRequest] = useState("");
  const [persona, setPersona] = useState("Claudia Barros");
  const [route, setRoute] = useState<ReturnType<typeof routeRequest> | null>(
    null,
  );
  const [registry, setRegistry] = useState<
    Record<
      AppKind,
      {
        state: "idle" | "loading" | "ready" | "error";
        error: string;
      }
    >
  >({
    clash: { state: "idle", error: "" },
    vendor: { state: "idle", error: "" },
  });
  const [retry, setRetry] = useState(0);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const appsRef = useRef(apps);
  appsRef.current = apps;
  const selected = sources.filter((source) =>
    selectedSources.includes(source.id),
  );
  const visiblePatterns = patterns.filter((pattern) =>
    selectedSources.includes(pattern.sourceId),
  );
  const activePattern =
    visiblePatterns.find((pattern) => pattern.id === selectedPatternId) ||
    visiblePatterns[0];
  const kind: AppKind =
    view === "patterns" &&
    (activePattern?.id === "clash" || activePattern?.id === "vendor")
      ? activePattern.id
      : activeKind;
  const definition = appCatalog[kind];
  const app = apps[kind];
  const registryState = registry[kind].state;
  const registryError = registry[kind].error;
  const appEvents = events.filter((event) => event.appId === definition.appId);
  const selectedVersion =
    app?.versions.find((version) => version.id === selectedVersionId) ||
    app?.versions.find((version) => version.id === app.currentVersionId);

  function persist(
    nextApp: AppRecord | null,
    nextEvents = events,
    nextKind = kind,
  ) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          apps: { ...apps, [nextKind]: nextApp },
          activeKind: nextKind,
          analyzed,
          events: nextEvents,
        }),
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
  }, [apps, activeKind, analyzed, events]);
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
    view === "apps" || view === "request" || (view === "patterns" && analyzed);
  useEffect(() => {
    if (!shouldDiscover) return;
    const controller = new AbortController();
    for (const target of Object.keys(appCatalog) as AppKind[]) {
      setRegistry((current) => ({
        ...current,
        [target]: { state: "loading", error: "" },
      }));
      discoverApp(target, appBaseUrl(target), controller.signal)
        .then((discovered) => {
          if (controller.signal.aborted) return;
          const next = mergeDiscoveredApp(discovered, appsRef.current[target]);
          setApps((current) => ({ ...current, [target]: next }));
          setRegistry((current) => ({
            ...current,
            [target]: { state: "ready", error: "" },
          }));
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setRegistry((current) => ({
            ...current,
            [target]: {
              state: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "The app is unavailable.",
            },
          }));
        });
    }
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
    const person = view === "patterns" ? definition.person : persona;
    const nextEvents = [
      ...events,
      {
        person,
        appId: app.id,
        request:
          view === "patterns"
            ? definition.request
            : request || `Open ${definition.name}.`,
        action: "REUSE" as const,
        versionId: version.id,
        at: new Date().toISOString(),
      },
    ].slice(-20);
    setEvents(nextEvents);
    launch(app, version, nextEvents);
  }
  function extendAndOpen() {
    if (!app || kind !== "clash" || registryState !== "ready") return;
    const next = extendApp(app, request, persona);
    const version = next.versions.find(
      (item) => item.id === next.currentVersionId,
    )!;
    const nextEvents = [
      ...events,
      {
        person: persona,
        appId: app.id,
        request,
        action: "EXTEND" as const,
        versionId: version.id,
        at: new Date().toISOString(),
      },
    ].slice(-20);
    setApps((current) => ({ ...current, [kind]: next }));
    setSelectedVersionId(version.id);
    setEvents(nextEvents);
    launch(next, version, nextEvents);
  }
  function checkRequest() {
    const target = requestAppKind(request, kind);
    setActiveKind(target);
    setSelectedVersionId("");
    setRoute(
      routeRequest(
        request,
        registry[target].state === "ready" ? apps[target] : null,
      ),
    );
  }
  function RegistryMatch() {
    return (
      <div className="registry-match" aria-live="polite">
        {registryState === "loading" || registryState === "idle" ? (
          <p className="match-status">Checking available apps…</p>
        ) : registryState === "error" ? (
          <>
            <div>
              <strong>{definition.name} is unavailable</strong>
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
                {definition.summary} · v
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
  function AppPicker() {
    return (
      <div className="app-picker" aria-label="Apps">
        {(Object.keys(appCatalog) as AppKind[]).map((target) => (
          <button
            key={target}
            className={`button ${kind === target ? "primary" : "secondary"}`}
            aria-pressed={kind === target}
            onClick={() => {
              setActiveKind(target);
              setSelectedVersionId("");
              setRoute(null);
              setRequest("");
            }}
          >
            {appCatalog[target].name}
            <span className="caption">
              {registry[target].state === "ready"
                ? "Available"
                : registry[target].state === "error"
                  ? "Unavailable"
                  : "Checking…"}
            </span>
          </button>
        ))}
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
                      setSelectedPatternId(visiblePatterns[0]?.id || "clash");
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
              <h2>
                {analyzed ? visiblePatterns.length : 0} recurring workflows
              </h2>
              <span className="small-label">Prepared analysis</span>
            </div>
            {!analyzed || !activePattern ? (
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
                      onClick={() => {
                        setSelectedPatternId(pattern.id);
                        if (pattern.id === "clash" || pattern.id === "vendor")
                          setActiveKind(pattern.id);
                      }}
                      aria-pressed={activePattern.id === pattern.id}
                    >
                      <span className="pattern-number">0{pattern.rank}</span>
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
                    {(activePattern.id === "clash" ||
                      activePattern.id === "vendor") && <RegistryMatch />}
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
                      {activePattern.id === "clash" && (
                        <p className="caption muted">
                          The existing app checks sample geometry. It does not
                          import or group Navisworks exports.
                        </p>
                      )}
                      {activePattern.id === "vendor" && (
                        <p className="caption muted">
                          The app demonstrates intake, document and security
                          checks, and human approval with sample vendors. It
                          does not import questionnaires or produce the full
                          six-category scorecard.
                        </p>
                      )}
                    </details>
                    {activePattern.id !== "clash" &&
                      activePattern.id !== "vendor" && (
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
                {Object.values(apps).filter(Boolean).length} apps
              </span>
            </div>
            <AppPicker />
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
                    <span className="tag">
                      {kind === "vendor" ? "Sample vendors" : "Sample model"}
                    </span>
                  </div>
                  <h2>{app.name}</h2>
                  <p>{definition.description}</p>
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
                          : definition.detail}
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
                        setRequest(
                          kind === "vendor" ? definition.request : examples[1],
                        );
                        setPersona(
                          kind === "vendor"
                            ? "Dana Whitfield"
                            : "Claudia Barros",
                        );
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
                    {!appEvents.length ? (
                      <p className="muted">
                        Requests appear here when a teammate uses or extends the
                        app.
                      </p>
                    ) : (
                      <div className="request-history">
                        {[...appEvents]
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
            <AppPicker />
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
                      <option>Dana Whitfield</option>
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
                      placeholder={
                        kind === "vendor"
                          ? "Review vendor documents and security checks for approval."
                          : "I’m color-blind. Can you make the clash report easier to read?"
                      }
                    />
                  </label>
                  <div className="form-actions">
                    <span className="muted">
                      {persona.split(" ")[0]} · New conversation
                    </span>
                    <button
                      className="button primary"
                      disabled={!request.trim()}
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
                          setActiveKind(
                            example === examples[1]
                              ? "clash"
                              : requestAppKind(example, kind),
                          );
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
                : modal.pattern.title
          }
          onClose={() => setModal(null)}
        >
          {modal.kind === "json" && (
            <pre className="json-view" tabIndex={0}>
              {getHistoryJson(modal.sourceId)}
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
                Clear this browser's Appstract requests and v2 extension. Both
                apps will still be available as v1. Vendor records are managed
                in the vendor app.
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
                    setApps({ clash: null, vendor: null });
                    appsRef.current = { clash: null, vendor: null };
                    setActiveKind("clash");
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
