import type { AppRecord } from "./domain.ts";

type PatternMemory = {
  title: string;
  evidence: {
    sessionId: string;
    quote: string;
    author: string;
  }[];
};

export type GBrainMatch = {
  appId: string;
  name: string;
  pageSlug: string;
  score: number;
};

export type GBrainRememberResult =
  | { available: true; pageSlug: string }
  | { available: false; error: string };

export type GBrainSearchResult =
  | { available: true; matches: GBrainMatch[] }
  | { available: false; matches: []; error: string };

export type GBrainFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function post(
  path: string,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
  fetcher: GBrainFetch,
): Promise<unknown> {
  const response = await fetcher(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok)
    throw new Error(`GBrain adapter request failed (${response.status}).`);
  return response.json();
}

function validRemember(value: unknown): value is GBrainRememberResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return result.available === true
    ? nonempty(result.pageSlug)
    : result.available === false && nonempty(result.error);
}

function validMatch(value: unknown): value is GBrainMatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const match = value as Record<string, unknown>;
  return (
    nonempty(match.appId) &&
    nonempty(match.name) &&
    nonempty(match.pageSlug) &&
    typeof match.score === "number" &&
    Number.isFinite(match.score)
  );
}

function validSearch(value: unknown): value is GBrainSearchResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (!Array.isArray(result.matches) || !result.matches.every(validMatch))
    return false;
  return result.available === true
    ? true
    : result.available === false &&
        result.matches.length === 0 &&
        nonempty(result.error);
}

export async function rememberAppInGBrain(
  app: AppRecord,
  pattern: PatternMemory,
  signal?: AbortSignal,
  fetcher: GBrainFetch = fetch,
): Promise<GBrainRememberResult> {
  try {
    const manifestUrl = new URL("app-manifest.json", app.url).href;
    const result = await post(
      "/api/gbrain/apps/remember",
      {
        app: {
          schemaVersion: 1,
          appId: app.id,
          name: app.name,
          task: pattern.title,
          presentations: [
            ...new Set(app.versions.map((version) => version.presentation)),
          ],
          manifestUrl,
          evidence: pattern.evidence.slice(0, 10),
          verifiedAt: new Date().toISOString(),
        },
      },
      signal,
      fetcher,
    );
    if (!validRemember(result))
      throw new Error("GBrain adapter returned an invalid response.");
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return {
      available: false,
      error:
        error instanceof Error
          ? error.message
          : "GBrain could not remember this app.",
    };
  }
}

export async function findAppsInGBrain(
  request: string,
  signal?: AbortSignal,
  fetcher: GBrainFetch = fetch,
): Promise<GBrainSearchResult> {
  const result = await post(
    "/api/gbrain/apps/search",
    { request },
    signal,
    fetcher,
  );
  if (!validSearch(result))
    throw new Error("GBrain adapter returned an invalid response.");
  return result;
}
