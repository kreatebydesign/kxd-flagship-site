import type { Observation } from "@/lib/observer/types";
import type { PulseResult } from "@/lib/pulse";
import type { BusinessMemoryHistoryRange, BusinessMemoryTimeline, PulseSnapshot } from "./types";

export function memoryId(prefix: string, key: string): string {
  return `memory:${prefix}:${key}`;
}

export function resolveHistoryRange(observations: Observation[]): BusinessMemoryHistoryRange {
  if (observations.length === 0) {
    const now = new Date().toISOString();
    return { start: now, end: now };
  }

  const timestamps = observations
    .map((obs) => new Date(obs.recordedAt).getTime())
    .filter((ts) => !Number.isNaN(ts))
    .sort((a, b) => a - b);

  return {
    start: new Date(timestamps[0]!).toISOString(),
    end: new Date(timestamps[timestamps.length - 1]!).toISOString(),
  };
}

export function historySpanDays(range: BusinessMemoryHistoryRange): number {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

export function splitObservationsByMidpoint(
  observations: Observation[],
): { earlier: Observation[]; later: Observation[] } {
  if (observations.length < 2) {
    return { earlier: [], later: observations };
  }

  const sorted = [...observations].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  const midpoint = Math.floor(sorted.length / 2);
  return {
    earlier: sorted.slice(0, midpoint),
    later: sorted.slice(midpoint),
  };
}

export function countBySource(
  observations: Observation[],
): Partial<Record<Observation["source"], number>> {
  const counts: Partial<Record<Observation["source"], number>> = {};
  for (const obs of observations) {
    counts[obs.source] = (counts[obs.source] ?? 0) + 1;
  }
  return counts;
}

export function snapshotFromPulse(pulse: PulseResult): PulseSnapshot {
  return {
    generatedAt: pulse.generatedAt,
    postureLevel: pulse.posture.level,
    postureLabel: pulse.posture.label,
    signalCount: pulse.priorities.length,
    changeCount: pulse.changes.filter((c) => c.direction !== "unchanged").length,
    watchlistCount: pulse.watchlist.length,
    priorityDomains: pulse.priorities.slice(0, 5).map((p) => p.domain),
  };
}

export function fingerprintToTaxonomy(
  fingerprint: string,
  source: Observation["source"],
): import("@/lib/business-brain/taxonomy").BusinessSignalTaxonomy {
  const lower = fingerprint.toLowerCase();
  if (lower.includes("blocked") || lower.includes("open-count")) {
    return "business.operations.load";
  }
  if (lower.includes("due") || lower.includes("deliverable")) {
    return "business.delivery.pressure";
  }
  if (source === "review" || lower.includes("review")) {
    return "business.review.backlog";
  }
  if (source === "communications" || lower.includes("needs-reply") || lower.includes("stale")) {
    return "business.communications.attention";
  }
  if (source === "timeline" || source === "relationship-health") {
    return "business.relationship.engagement";
  }
  if (lower.includes("completed")) {
    return "business.execution.momentum";
  }
  if (source === "business-health") {
    return "business.health.pressure";
  }
  if (source === "brain-memory") {
    return "business.memory.lifecycle";
  }
  if (source === "client-request") {
    return "business.client-requests.open";
  }
  return "business.operations.load";
}
