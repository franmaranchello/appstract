export type AppVersion = {
  id: string;
  number: number;
  presentation: "baseline" | "non-color";
  request: string;
  createdAt: string;
};

export type AppRecord = {
  id: string;
  name: string;
  createdAt: string;
  versions: AppVersion[];
  currentVersionId: string;
  url: string;
};

export function createDemoApp(request: string): AppRecord {
  const createdAt = new Date().toISOString();
  const id = `clash-review-${crypto.randomUUID()}`;
  const version: AppVersion = {
    id: `${id}-v1`,
    number: 1,
    presentation: "baseline",
    request,
    createdAt,
  };
  return {
    id,
    name: "Clash review app",
    createdAt,
    versions: [version],
    currentVersionId: version.id,
    url: "",
  };
}

export function extendApp(app: AppRecord, request: string): AppRecord {
  if (app.versions.some((version) => version.presentation === "non-color"))
    return app;
  const number = Math.max(...app.versions.map((version) => version.number)) + 1;
  const version: AppVersion = {
    id: `${app.id}-v${number}`,
    number,
    presentation: "non-color",
    request,
    createdAt: new Date().toISOString(),
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
    /\b(navisworks|xml|ifc|bcf)\b|\b(group|grouping|triage|assign|ownership)\b/.test(
      request,
    )
  ) {
    return {
      action: "CLARIFY",
      title: "Different input or task",
      reason:
        "Demo rules support sample geometry clash checks. File parsing and issue grouping need a different app contract.",
    };
  }
  const compatible =
    (/\bclash(?:es)?\b/.test(request) &&
      /\b(check|checks|detect|detection|report|review|run)\b/.test(request)) ||
    /\bsample\s+(?:building|model|geometry)\b/.test(request);
  if (!compatible)
    return {
      action: "CLARIFY",
      title: "Describe the sample clash check",
      reason:
        "This rule-based demo recognizes sample-model clash checks; it cannot confirm a match for this request.",
    };
  if (!app)
    return {
      action: "CREATE",
      title: "Set up the clash review app",
      reason:
        "Demo rules recognize the sample clash workflow. No app is saved in this local catalog yet.",
    };
  const accessible =
    /colou?r[-\s]?blind|non[-\s]?colou?r|without\s+colou?r|(?:cannot|can.t)\s+distinguish|\baccessible\b|\bshapes\b|\bpatterns\b/.test(
      request,
    );
  const nonColorVersion = app.versions.find(
    (version) => version.presentation === "non-color",
  );
  if (accessible && !nonColorVersion)
    return {
      action: "EXTEND",
      title: "Add non-color presentation",
      versionId: app.currentVersionId,
      reason:
        "Demo rules match the existing sample clash app. Labels and shapes require a new presentation version.",
    };
  return {
    action: "REUSE",
    title: "Reuse the saved app",
    versionId: accessible ? nonColorVersion!.id : app.currentVersionId,
    reason:
      "Demo rules match a saved version with the requested sample workflow and presentation. No new version is needed.",
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
