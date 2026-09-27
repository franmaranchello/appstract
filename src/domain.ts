export type AppVersion = {
  id: string;
  number: number;
  presentation: "baseline" | "non-color";
  request: string;
  createdAt: string;
  requestedBy?: string;
};

export type AppRecord = {
  id: string;
  name: string;
  createdAt: string;
  versions: AppVersion[];
  currentVersionId: string;
  url: string;
};

export function createDemoApp(
  request: string,
  name = "Clash detection",
): AppRecord {
  const createdAt = new Date().toISOString();
  const id = "appstract.clash-check";
  const version: AppVersion = {
    id: "clash-v1",
    number: 1,
    presentation: "baseline",
    request,
    createdAt,
  };
  return {
    id,
    name,
    createdAt,
    versions: [version],
    currentVersionId: version.id,
    url: "",
  };
}

export function extendApp(
  app: AppRecord,
  request: string,
  requestedBy?: string,
): AppRecord {
  if (app.versions.some((version) => version.presentation === "non-color"))
    return app;
  const number = Math.max(...app.versions.map((version) => version.number)) + 1;
  const version: AppVersion = {
    id: `clash-v${number}`,
    number,
    presentation: "non-color",
    request,
    createdAt: new Date().toISOString(),
    ...(requestedBy ? { requestedBy } : {}),
  };
  return {
    ...app,
    versions: [...app.versions, version],
    currentVersionId: version.id,
  };
}

type Route = {
  action: "CREATE" | "REUSE" | "EXTEND" | "CLARIFY";
  title: string;
  reason: string;
  versionId?: string;
};

export function routeRequest(text: string, app: AppRecord | null): Route {
  const request = text.toLowerCase();
  if (
    /\b(navisworks|xml|ifc|bcf|group|grouping|triage|assign|ownership)\b/.test(
      request,
    )
  ) {
    return {
      action: "CLARIFY",
      title: "Different input or task",
      reason:
        "This app checks the sample building. File parsing and issue grouping need a different app.",
    };
  }
  if (
    /\b(finance|financial|invoice|invoices|vendor|procurement|submittal|submittals|payroll|budget|cash|accounting)\b/.test(
      request,
    )
  ) {
    return {
      action: "CLARIFY",
      title: "A different workflow",
      reason:
        "The clash app does not support that workflow. Choose the matching task before continuing.",
    };
  }
  const accessible =
    /colou?r[-\s]?blind|non[-\s]?colou?r|without\s+colou?r|(?:cannot|can.t)\s+distinguish|\baccessible\b|\bshapes\b|\bpatterns\b/.test(
      request,
    );
  const explicitClash =
    (/\bclash(?:es)?\b/.test(request) &&
      /\b(check|checks|detect|detection|report|review|run)\b/.test(request)) ||
    /\bsample\s+(?:building|model|geometry)\b/.test(request);
  const contextual =
    !!app &&
    accessible &&
    /\b(same|this|existing)\s+(?:tool|app|report)\b|\bit\b/.test(request);
  if (!explicitClash && !contextual)
    return {
      action: "CLARIFY",
      title: "Which task would you like to run?",
      reason:
        "Ask for a clash check, or describe how you want to change the existing clash app.",
    };
  if (!app)
    return {
      action: "CLARIFY",
      title: "Clash app is not available",
      reason:
        "The clash app has not been found yet. Start the app and try again.",
    };
  const nonColorVersion = app.versions.find(
    (version) => version.presentation === "non-color",
  );
  if (accessible && !nonColorVersion)
    return {
      action: "EXTEND",
      title: "Make the same app easier to read",
      versionId: app.currentVersionId,
      reason:
        "Keep the clash check and add numbered markers, shapes and labels in a new version.",
    };
  return {
    action: "REUSE",
    title: "Use the existing clash app",
    versionId: accessible ? nonColorVersion!.id : app.currentVersionId,
    reason:
      "The saved app already supports this request. Open it without creating another version.",
  };
}

function allowedUrl(value: string): URL | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password) return null;
    return url.protocol === "https:" || (url.protocol === "http:" && loopback)
      ? url
      : null;
  } catch {
    return null;
  }
}

export function buildLaunchUrl(
  app: AppRecord,
  version: AppVersion,
  returnTo?: string,
): string | null {
  const url = allowedUrl(app.url);
  if (
    !url ||
    !app.versions.some(
      (saved) =>
        saved.id === version.id && saved.presentation === version.presentation,
    )
  )
    return null;
  url.hash = new URLSearchParams({
    appId: app.id,
    appVersionId: version.id,
    sourceRequestId: `request-${version.id}`,
    mode: "sample",
    presentation: version.presentation,
    fixtureId: "sample-building",
    ...(returnTo && allowedUrl(returnTo)
      ? { returnTo: allowedUrl(returnTo)!.toString() }
      : {}),
  }).toString();
  return url.toString();
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function date(value: unknown): value is string {
  return nonempty(value) && Number.isFinite(Date.parse(value));
}

export function validateApp(value: unknown): AppRecord | null {
  if (
    !record(value) ||
    !nonempty(value.id) ||
    !nonempty(value.name) ||
    !date(value.createdAt) ||
    !nonempty(value.currentVersionId) ||
    typeof value.url !== "string" ||
    (value.url.trim() !== "" && !allowedUrl(value.url)) ||
    !Array.isArray(value.versions) ||
    value.versions.length === 0
  )
    return null;
  const versions: AppVersion[] = [];
  for (const version of value.versions) {
    if (
      !record(version) ||
      !nonempty(version.id) ||
      !Number.isSafeInteger(version.number) ||
      (version.number as number) < 1 ||
      !date(version.createdAt) ||
      typeof version.request !== "string" ||
      (version.requestedBy !== undefined && !nonempty(version.requestedBy)) ||
      (version.presentation !== "baseline" &&
        version.presentation !== "non-color") ||
      versions.some(
        (saved) => saved.id === version.id || saved.number === version.number,
      )
    )
      return null;
    versions.push({
      id: version.id,
      number: version.number as number,
      presentation: version.presentation,
      request: version.request,
      createdAt: version.createdAt,
      ...(typeof version.requestedBy === "string"
        ? { requestedBy: version.requestedBy }
        : {}),
    });
  }
  if (!versions.some((version) => version.id === value.currentVersionId))
    return null;
  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
    url: value.url,
    currentVersionId: value.currentVersionId,
    versions,
  };
}
