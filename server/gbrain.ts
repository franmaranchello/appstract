import { execFile } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";

const RECORD_MARKER = "APPSTRACT_APP_RECORD_V1";
const BODY_LIMIT = 65_536;
const APP_SLUG_PREFIX = "appstract/apps/";

export type AppMemoryEvidence = {
  sessionId: string;
  quote: string;
  author: string;
};

export type AppMemoryRecord = {
  schemaVersion: 1;
  appId: string;
  name: string;
  task: string;
  presentations: string[];
  manifestUrl: string;
  evidence: AppMemoryEvidence[];
  verifiedAt: string;
};

export type GBrainMatch = {
  appId: string;
  name: string;
  pageSlug: string;
  score: number;
};

export type GBrainRunner = (
  args: string[],
  input?: string,
) => Promise<string>;

type ApiRequest = {
  method: string;
  path: string;
  body: string;
};

type ApiResponse = {
  status: number;
  body: Record<string, unknown>;
};

type SearchRow = {
  slug?: unknown;
  score?: unknown;
  chunk_text?: unknown;
};

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validEvidence(value: unknown): value is AppMemoryEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    nonempty(item.sessionId) &&
    nonempty(item.quote) &&
    nonempty(item.author)
  );
}

function validRecord(value: unknown): value is AppMemoryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    item.schemaVersion === 1 &&
    nonempty(item.appId) &&
    item.appId.length <= 120 &&
    nonempty(item.name) &&
    item.name.length <= 160 &&
    nonempty(item.task) &&
    item.task.length <= 240 &&
    Array.isArray(item.presentations) &&
    item.presentations.length > 0 &&
    item.presentations.length <= 20 &&
    item.presentations.every(
      (presentation) => nonempty(presentation) && presentation.length <= 80,
    ) &&
    nonempty(item.manifestUrl) &&
    item.manifestUrl.length <= 2_048 &&
    Array.isArray(item.evidence) &&
    item.evidence.length <= 20 &&
    item.evidence.every(validEvidence) &&
    nonempty(item.verifiedAt) &&
    Number.isFinite(Date.parse(item.verifiedAt))
  );
}

function pageSlug(appId: string): string {
  const safe = appId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${APP_SLUG_PREFIX}${safe}`;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function serializeAppPage(record: AppMemoryRecord): string {
  const evidence = record.evidence
    .map(
      (item) =>
        `- ${item.sessionId} — ${item.author}: ${item.quote.replace(/\s+/g, " ").trim()}`,
    )
    .join("\n");
  return `---
title: ${yamlString(`Appstract app: ${record.name}`)}
type: note
tags:
  - appstract
  - app-catalog
  - ${record.task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
---

${RECORD_MARKER}
${JSON.stringify(record)}

# ${record.name}

Appstract verified this app manifest at ${record.verifiedAt}.

## Supported task

${record.task}

## Presentations

${record.presentations.map((item) => `- ${item}`).join("\n")}

## Source evidence

${evidence || "- No source evidence supplied."}
`;
}

export const runGBrain: GBrainRunner = (args, input) =>
  new Promise((resolve, reject) => {
    const child = execFile(
      "gbrain",
      args,
      {
        encoding: "utf8",
        timeout: 5_000,
        maxBuffer: 1_000_000,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      },
    );
    if (input !== undefined) child.stdin?.end(input);
  });

function unavailableMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  )
    return "GBrain is not installed or is unavailable.";
  return "GBrain is not configured or could not be reached.";
}

export async function rememberApp(
  record: AppMemoryRecord,
  runner: GBrainRunner = runGBrain,
): Promise<
  | { available: true; pageSlug: string }
  | { available: false; error: string }
> {
  if (!validRecord(record))
    return { available: false, error: "The app memory record is invalid." };
  const slug = pageSlug(record.appId);
  try {
    await runner(["put", slug, "--force", "--json"], serializeAppPage(record));
    return { available: true, pageSlug: slug };
  } catch (error) {
    return { available: false, error: unavailableMessage(error) };
  }
}

function recordFromChunk(chunk: string): AppMemoryRecord | null {
  const marker = `${RECORD_MARKER}\n`;
  const start = chunk.indexOf(marker);
  if (start === -1) return null;
  const line = chunk.slice(start + marker.length).split(/\r?\n/, 1)[0];
  try {
    const value: unknown = JSON.parse(line);
    return validRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export async function searchApps(
  query: string,
  runner: GBrainRunner = runGBrain,
): Promise<
  | { available: true; matches: GBrainMatch[] }
  | { available: false; matches: []; error: string }
> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 2_000)
    return {
      available: false,
      matches: [],
      error: "The app search request is invalid.",
    };
  let output: string;
  try {
    output = await runner([
      "search",
      `${trimmed} appstract app catalog`,
      "--limit",
      "5",
      "--json",
    ]);
  } catch (error) {
    return {
      available: false,
      matches: [],
      error: unavailableMessage(error),
    };
  }
  let rows: unknown;
  try {
    rows = JSON.parse(output);
  } catch {
    return {
      available: false,
      matches: [],
      error: "GBrain returned an unreadable search response.",
    };
  }
  if (!Array.isArray(rows))
    return {
      available: false,
      matches: [],
      error: "GBrain returned an unreadable search response.",
    };
  const matches: GBrainMatch[] = [];
  for (const value of rows) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as SearchRow;
    if (
      !nonempty(row.slug) ||
      !row.slug.startsWith(APP_SLUG_PREFIX) ||
      !nonempty(row.chunk_text)
    )
      continue;
    const record = recordFromChunk(row.chunk_text);
    if (!record || pageSlug(record.appId) !== row.slug) continue;
    matches.push({
      appId: record.appId,
      name: record.name,
      pageSlug: row.slug,
      score:
        typeof row.score === "number" && Number.isFinite(row.score)
          ? row.score
          : 0,
    });
  }
  return { available: true, matches };
}

function parseBody(body: string): unknown {
  if (body.length > BODY_LIMIT) throw new RangeError("body too large");
  return JSON.parse(body);
}

export async function handleGBrainApi(
  request: ApiRequest,
  runner: GBrainRunner = runGBrain,
): Promise<ApiResponse> {
  if (request.method !== "POST")
    return { status: 405, body: { error: "Method not allowed." } };
  if (request.body.length > BODY_LIMIT)
    return { status: 413, body: { error: "Request body is too large." } };
  let payload: unknown;
  try {
    payload = parseBody(request.body);
  } catch (error) {
    return {
      status: error instanceof RangeError ? 413 : 400,
      body: { error: "Request body must be valid JSON." },
    };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return { status: 400, body: { error: "Request body is invalid." } };
  const body = payload as Record<string, unknown>;
  if (request.path === "/api/gbrain/apps/remember") {
    if (!validRecord(body.app))
      return { status: 400, body: { error: "App record is invalid." } };
    return { status: 200, body: await rememberApp(body.app, runner) };
  }
  if (request.path === "/api/gbrain/apps/search") {
    if (!nonempty(body.request))
      return { status: 400, body: { error: "Search request is required." } };
    return { status: 200, body: await searchApps(body.request, runner) };
  }
  return { status: 404, body: { error: "Not found." } };
}

function originAllowed(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readBody(request: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > BODY_LIMIT) throw new RangeError("body too large");
  }
  return body;
}

export function createGBrainMiddleware(options?: { runner?: GBrainRunner }) {
  const runner = options?.runner || runGBrain;
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => {
    const path = new URL(request.url || "/", "http://localhost").pathname;
    if (!path.startsWith("/api/gbrain/")) {
      next();
      return;
    }
    if (!originAllowed(request)) {
      response.statusCode = 403;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: "Origin is not allowed." }));
      return;
    }
    let result: ApiResponse;
    try {
      result = await handleGBrainApi(
        {
          method: request.method || "GET",
          path,
          body: await readBody(request),
        },
        runner,
      );
    } catch (error) {
      result = {
        status: error instanceof RangeError ? 413 : 500,
        body: {
          error:
            error instanceof RangeError
              ? "Request body is too large."
              : "The GBrain adapter failed.",
        },
      };
    }
    response.statusCode = result.status;
    response.setHeader("content-type", "application/json");
    response.setHeader("cache-control", "no-store");
    response.end(JSON.stringify(result.body));
  };
}
