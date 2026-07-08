import type { Observation, ObservationImportance } from "@/lib/observer/types";
import type { BusinessSignalSeverity } from "./types";

export function signalId(taxonomy: string, key: string): string {
  return `signal:${taxonomy}:${key}`;
}

export function patternId(taxonomy: string, key: string): string {
  return `pattern:${taxonomy}:${key}`;
}

export function attentionId(key: string): string {
  return `attention:${key}`;
}

export function severityFromImportance(importance: ObservationImportance): BusinessSignalSeverity {
  if (importance === "critical") return "critical";
  if (importance === "high") return "high";
  if (importance === "low") return "low";
  return "moderate";
}

export function maxSeverity(
  a: BusinessSignalSeverity,
  b: BusinessSignalSeverity,
): BusinessSignalSeverity {
  const rank: Record<BusinessSignalSeverity, number> = {
    critical: 0,
    high: 1,
    moderate: 2,
    low: 3,
    positive: 4,
  };
  return rank[a] <= rank[b] ? a : b;
}

export function observationsMatching(
  observations: Observation[],
  predicate: (obs: Observation) => boolean,
): Observation[] {
  return observations.filter(predicate);
}

export function fingerprints(observations: Observation[]): string[] {
  return observations.map((obs) => obs.fingerprint);
}

export function countBySource(observations: Observation[], source: Observation["source"]): number {
  return observations.filter((obs) => obs.source === source).length;
}
