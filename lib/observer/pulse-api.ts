import "server-only";

import { getObservationHistory } from "./history";
import { getLatestRegistry } from "./registry";
import { runObserver } from "./run";
import type { Observation, ObserverSource } from "./types";

/**
 * Phase 17A — Pulse preparation APIs.
 * Deterministic read surface for future Pulse Engine.
 * Do NOT build Pulse in this phase.
 */

export interface PulseObservationQuery {
  source?: ObserverSource;
  clientId?: number;
  since?: string;
  importance?: Observation["importance"];
  limit?: number;
}

export interface PulseDeltaResult {
  since: string;
  added: Observation[];
  unchanged: Observation[];
  repeated: Array<{ fingerprint: string; count: number; latest: Observation }>;
  novel: Observation[];
}

/** Latest normalized observations — runs observer if no cached registry */
export async function pulseGetObservations(
  query: PulseObservationQuery = {},
): Promise<Observation[]> {
  let observations = getLatestRegistry()?.getAll() ?? [];
  if (observations.length === 0) {
    const result = await runObserver();
    observations = result.observations;
  }

  let filtered = observations;

  if (query.source) {
    filtered = filtered.filter((obs) => obs.source === query.source);
  }
  if (query.clientId != null) {
    filtered = filtered.filter((obs) => obs.relatedClientId === query.clientId);
  }
  if (query.since) {
    const ts = new Date(query.since).getTime();
    filtered = filtered.filter((obs) => new Date(obs.recordedAt).getTime() >= ts);
  }
  if (query.importance) {
    filtered = filtered.filter((obs) => obs.importance === query.importance);
  }
  if (query.limit) {
    filtered = filtered.slice(0, query.limit);
  }

  return filtered;
}

/** Observations grouped by source for Pulse dashboards */
export async function pulseGetObservationsBySource(): Promise<
  Partial<Record<ObserverSource, Observation[]>>
> {
  const observations = await pulseGetObservations();
  const grouped: Partial<Record<ObserverSource, Observation[]>> = {};

  for (const obs of observations) {
    const list = grouped[obs.source] ?? [];
    list.push(obs);
    grouped[obs.source] = list;
  }

  return grouped;
}

/** What changed since a timestamp — for future Pulse change detection */
export function pulseGetDelta(sinceIso: string): PulseDeltaResult {
  const history = getObservationHistory();
  const { added, unchanged } = history.delta(sinceIso);

  return {
    since: sinceIso,
    added,
    unchanged,
    repeated: history.repeated().slice(0, 20),
    novel: history.novel().slice(0, 20),
  };
}

/** Stable signals across recent runs */
export function pulseGetStableSignals(recentRuns = 3): Observation[] {
  return getObservationHistory().stable(recentRuns);
}

/** Actionable observations for future automation triage */
export async function pulseGetActionableObservations(): Promise<Observation[]> {
  const observations = await pulseGetObservations();
  return observations.filter(
    (obs) => obs.automation.actionable && !obs.automation.resolved,
  );
}
