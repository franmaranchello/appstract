import { appCatalog, appKindForId, type AppKind } from "./catalog.ts";
import { createCatalogApp, validateApp, type AppRecord } from "./domain.ts";

export class AppDiscoveryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AppDiscoveryError";
    this.code = code;
  }
}

function appRoot(value: string): URL {
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      !(
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      )
    )
      throw new Error();
    url.hash = "";
    url.search = "";
    if (url.pathname.endsWith("/app-manifest.json"))
      url.pathname = url.pathname.slice(0, -"app-manifest.json".length);
    else if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url;
  } catch {
    throw new AppDiscoveryError(
      "INVALID_URL",
      "The app address must use HTTPS or a local development address.",
    );
  }
}

function manifestIsValid(
  value: unknown,
  kind: AppKind,
): value is { name: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>;
  const definition = appCatalog[kind];
  const keys = [
    "schemaVersion",
    "appId",
    "name",
    "fixtureId",
    "baselineVersionId",
    "presentations",
  ];
  return (
    Object.keys(m).every((key) => keys.includes(key)) &&
    m.schemaVersion === 1 &&
    m.appId === definition.appId &&
    m.name === definition.name &&
    m.fixtureId === definition.fixtureId &&
    m.baselineVersionId === definition.baselineVersionId &&
    Array.isArray(m.presentations) &&
    m.presentations.length === definition.presentations.length &&
    definition.presentations.every((presentation) =>
      (m.presentations as unknown[]).includes(presentation),
    )
  );
}

export function discoverClashApp(baseUrl: string, signal?: AbortSignal) {
  return discoverApp("clash", baseUrl, signal);
}

export async function discoverApp(
  kind: AppKind,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<AppRecord> {
  const definition = appCatalog[kind];
  const root = appRoot(baseUrl);
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    abort = () => {
      controller.abort();
      reject(
        new AppDiscoveryError(
          "DISCOVERY_ABORTED",
          "App discovery was cancelled.",
        ),
      );
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    timeout = setTimeout(() => {
      controller.abort();
      reject(
        new AppDiscoveryError(
          "DISCOVERY_TIMEOUT",
          `${definition.name} did not respond. Start it and try again.`,
        ),
      );
    }, 4000);
  });
  try {
    const load = async () => {
      const response = await fetch(new URL("app-manifest.json", root), {
        signal: controller.signal,
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok)
        throw new AppDiscoveryError(
          "DISCOVERY_FAILED",
          `${definition.name} is unavailable. Start it and try again.`,
        );
      let manifest: unknown;
      try {
        manifest = await response.json();
      } catch {
        throw new AppDiscoveryError(
          "INVALID_MANIFEST",
          `${definition.name} returned an unreadable manifest.`,
        );
      }
      if (!manifestIsValid(manifest, kind))
        throw new AppDiscoveryError(
          "INVALID_MANIFEST",
          `The running app does not match the supported ${definition.name} contract.`,
        );
      return {
        ...createCatalogApp(kind, definition.request),
        url: root.toString(),
      };
    };
    return await Promise.race([load(), interrupted]);
  } catch (error) {
    if (error instanceof AppDiscoveryError) throw error;
    if (signal?.aborted)
      throw new AppDiscoveryError(
        "DISCOVERY_ABORTED",
        "App discovery was cancelled.",
      );
    throw new AppDiscoveryError(
      "DISCOVERY_FAILED",
      `Could not reach ${definition.name}. Start it and try again.`,
    );
  } finally {
    clearTimeout(timeout);
    if (abort) signal?.removeEventListener("abort", abort);
  }
}

export function mergeDiscoveredApp(
  discovered: AppRecord,
  saved?: AppRecord | null,
): AppRecord {
  const valid = validateApp(saved);
  const kind = appKindForId(discovered.id);
  if (!kind || !valid || valid.id !== discovered.id) return discovered;
  if (kind === "vendor") {
    return valid.versions.length === 1 &&
      valid.versions[0].id === "vendor-v1" &&
      valid.versions[0].number === 1 &&
      valid.versions[0].presentation === "baseline"
      ? { ...valid, name: discovered.name, url: discovered.url }
      : discovered;
  }
  const allowed = valid.versions.every(
    (version) =>
      (version.id === "clash-v1" &&
        version.number === 1 &&
        version.presentation === "baseline") ||
      (version.id === "clash-v2" &&
        version.number === 2 &&
        version.presentation === "non-color"),
  );
  if (!allowed || !valid.versions.some((version) => version.id === "clash-v1"))
    return discovered;
  return { ...valid, name: discovered.name, url: discovered.url };
}
