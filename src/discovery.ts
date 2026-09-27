import type { DiscoveryJob } from "./discovery-types";
export async function discoveryRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/discovery/${path}`, {
    method: body === undefined ? "GET" : "POST",
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "The live QM demo bridge is unavailable. Reconnect the demo server and retry.",
    );
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "Discovery request failed.");
  return value as T;
}
export function startDiscovery(sourceIds: string[]) {
  return discoveryRequest<DiscoveryJob>("jobs", { sourceIds });
}
export function getDiscovery(id: string) {
  return discoveryRequest<DiscoveryJob>(`jobs/${encodeURIComponent(id)}`);
}
