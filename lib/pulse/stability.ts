import { taxonomyLabel } from "@/lib/business-brain";
import type { BusinessPattern } from "@/lib/business-brain";
import { BUSINESS_SIGNAL_TAXONOMY } from "@/lib/business-brain/taxonomy";
import type { Observation } from "@/lib/observer/types";
import type { StableSignal } from "./types";
import { stableId } from "./utils";

function fingerprintToTaxonomy(
  fingerprint: string,
  source: Observation["source"],
): (typeof BUSINESS_SIGNAL_TAXONOMY)[keyof typeof BUSINESS_SIGNAL_TAXONOMY] {
  const lower = fingerprint.toLowerCase();
  if (lower.includes("blocked")) return BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD;
  if (lower.includes("due") || lower.includes("deliverable"))
    return BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE;
  if (source === "review") return BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG;
  if (source === "communications") return BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION;
  if (source === "timeline") return BUSINESS_SIGNAL_TAXONOMY.RELATIONSHIP_ENGAGEMENT;
  if (lower.includes("completed")) return BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM;
  if (lower.includes(":clear")) return BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM;
  return BUSINESS_SIGNAL_TAXONOMY.HEALTH_PRESSURE;
}

function stableFromObservation(obs: Observation, runCount: number): StableSignal {
  const taxonomy = fingerprintToTaxonomy(obs.fingerprint, obs.source);
  const isClear = obs.fingerprint.includes(":clear");

  return {
    id: stableId(obs.fingerprint),
    label: isClear
      ? `${taxonomyLabel(taxonomy)} stable`
      : `Stable ${taxonomyLabel(taxonomy).toLowerCase()}`,
    description: isClear
      ? `${obs.fact} — persisting across recent observation runs.`
      : `${obs.fact} — consistent across ${runCount} recent runs.`,
    taxonomy,
    observationFingerprints: [obs.fingerprint],
    runCount,
  };
}

function stableFromPattern(pattern: BusinessPattern): StableSignal {
  return {
    id: stableId(`pattern:${pattern.id}`),
    label: pattern.label,
    description: pattern.description,
    taxonomy: pattern.taxonomy,
    observationFingerprints: pattern.observationFingerprints,
    runCount: pattern.occurrenceCount,
  };
}

/**
 * Identify stable executive signals from observation history and brain patterns.
 */
export function buildStableSignals(
  stableObservations: Observation[],
  patterns: BusinessPattern[],
  recentRuns = 3,
): StableSignal[] {
  const signals: StableSignal[] = [];

  for (const obs of stableObservations.slice(0, 6)) {
    signals.push(stableFromObservation(obs, recentRuns));
  }

  for (const pattern of patterns.filter((p) => p.trend === "stable")) {
    if (!signals.some((s) => s.id === stableId(`pattern:${pattern.id}`))) {
      signals.push(stableFromPattern(pattern));
    }
  }

  const seen = new Set<string>();
  return signals
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .slice(0, 8);
}
