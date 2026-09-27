import type { Pattern } from "./data";
export interface DiscoveryJob {
  id: string;
  status: "running" | "complete" | "failed";
  sourceIds: string[];
  completedSources: number;
  totalSources: number;
  patterns: Pattern[];
  runs: { sourceId: string; runId: string; sessionId?: string }[];
  startedAt: string;
  source?: "qm";
  analysisMode?: "saved";
  readAt?: string;
  analyzedAt?: string;
  error?: string;
}
