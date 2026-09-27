import { appCatalog, appKindForId, type AppKind } from "./catalog.ts";
import { validateApp, type AppRecord } from "./domain.ts";

export const STORAGE_KEY = "appstract-connected-demo-v1";
export type RequestEvent = {
  appId: string;
  person: string;
  request: string;
  action: "REUSE" | "EXTEND";
  versionId: string;
  at: string;
};
type SavedState = {
  apps: Record<AppKind, AppRecord | null>;
  activeKind: AppKind;
  analyzed: boolean;
  events: RequestEvent[];
};

export function loadSaved(storage?: Pick<Storage, "getItem">): SavedState {
  const empty: SavedState = {
    apps: { clash: null, vendor: null },
    activeKind: "clash",
    analyzed: false,
    events: [],
  };
  try {
    const state = JSON.parse(
      (storage ?? localStorage).getItem(STORAGE_KEY) || "{}",
    );
    for (const kind of Object.keys(appCatalog) as AppKind[]) {
      const candidate = validateApp(
        state.apps?.[kind] ?? (kind === "clash" ? state.app : null),
      );
      if (candidate?.id === appCatalog[kind].appId)
        empty.apps[kind] = candidate;
    }
    empty.activeKind = state.activeKind === "vendor" ? "vendor" : "clash";
    empty.analyzed = state.analyzed === true;
    empty.events = Array.isArray(state.events)
      ? state.events
          .flatMap((event: unknown) => {
            if (!event || typeof event !== "object") return [];
            const e = event as Record<string, unknown>;
            const appId = e.appId ?? appCatalog.clash.appId;
            const kind =
              typeof appId === "string" ? appKindForId(appId) : undefined;
            if (
              !kind ||
              typeof e.person !== "string" ||
              typeof e.request !== "string" ||
              typeof e.versionId !== "string" ||
              typeof e.at !== "string" ||
              !Number.isFinite(Date.parse(e.at)) ||
              (e.action !== "REUSE" && e.action !== "EXTEND") ||
              !e.versionId.startsWith(`${kind}-v`)
            )
              return [];
            return [{ ...e, appId } as RequestEvent];
          })
          .slice(-20)
      : [];
    return empty;
  } catch {
    return {
      apps: { clash: null, vendor: null },
      activeKind: "clash",
      analyzed: false,
      events: [],
    };
  }
}
