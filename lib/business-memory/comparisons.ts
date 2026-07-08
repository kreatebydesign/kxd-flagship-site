import { taxonomyLabel } from "@/lib/business-brain";
import type { BusinessComparison, BusinessMemoryInput } from "./types";
import {
  fingerprintToTaxonomy,
  memoryId,
  resolveHistoryRange,
  splitObservationsByMidpoint,
} from "./utils";

/**
 * Compare earlier vs later observation history periods.
 */
export function buildBusinessComparisons(input: BusinessMemoryInput): BusinessComparison[] {
  const comparisons: BusinessComparison[] = [];
  const range = resolveHistoryRange(input.observations);
  const { earlier, later } = splitObservationsByMidpoint(input.observations);

  if (earlier.length === 0 || later.length === 0) {
    return comparisons;
  }

  const earlierMid = earlier[Math.floor(earlier.length / 2)]!.recordedAt;
  const laterMid = later[Math.floor(later.length / 2)]!.recordedAt;

  const earlierPeriod = `Earlier (${new Date(range.start).toLocaleDateString()} – ${new Date(earlierMid).toLocaleDateString()})`;
  const laterPeriod = `Later (${new Date(laterMid).toLocaleDateString()} – ${new Date(range.end).toLocaleDateString()})`;

  const earlierTaxonomies = countTaxonomies(earlier);
  const laterTaxonomies = countTaxonomies(later);
  const allTaxonomies = new Set([...earlierTaxonomies.keys(), ...laterTaxonomies.keys()]);

  for (const taxonomy of allTaxonomies) {
    const before = earlierTaxonomies.get(taxonomy) ?? 0;
    const after = laterTaxonomies.get(taxonomy) ?? 0;

    let shift: BusinessComparison["shift"];
    if (before === 0 && after > 0) shift = "novel";
    else if (after > before * 1.25) shift = "increased";
    else if (after < before * 0.75) shift = "decreased";
    else shift = "stable";

    if (shift === "stable" && before < 2 && after < 2) continue;

    comparisons.push({
      id: memoryId("comparison", taxonomy),
      label: `${taxonomyLabel(taxonomy)} over time`,
      description: describeShift(taxonomyLabel(taxonomy), shift, before, after),
      earlierPeriod,
      laterPeriod,
      shift,
      taxonomy,
      observationFingerprints: [],
    });
  }

  const earlierSources = countSources(earlier);
  const laterSources = countSources(later);
  const activityBefore = earlierSources.get("timeline") ?? 0;
  const activityAfter = laterSources.get("timeline") ?? 0;

  if (activityAfter > activityBefore + 1) {
    comparisons.push({
      id: memoryId("comparison", "relationship-activity"),
      label: "Relationship activity over time",
      description: "Client relationship activity signals have increased across the observation history.",
      earlierPeriod,
      laterPeriod,
      shift: "increased",
      taxonomy: "business.relationship.engagement",
      observationFingerprints: later
        .filter((obs) => obs.source === "timeline")
        .slice(0, 5)
        .map((obs) => obs.fingerprint),
    });
  }

  return comparisons.slice(0, 8);
}

function countTaxonomies(
  observations: import("@/lib/observer/types").Observation[],
): Map<import("@/lib/business-brain/taxonomy").BusinessSignalTaxonomy, number> {
  const map = new Map<import("@/lib/business-brain/taxonomy").BusinessSignalTaxonomy, number>();
  for (const obs of observations) {
    const taxonomy = fingerprintToTaxonomy(obs.fingerprint, obs.source);
    map.set(taxonomy, (map.get(taxonomy) ?? 0) + 1);
  }
  return map;
}

function countSources(
  observations: import("@/lib/observer/types").Observation[],
): Map<import("@/lib/observer/types").Observation["source"], number> {
  const map = new Map<import("@/lib/observer/types").Observation["source"], number>();
  for (const obs of observations) {
    map.set(obs.source, (map.get(obs.source) ?? 0) + 1);
  }
  return map;
}

function describeShift(
  label: string,
  shift: BusinessComparison["shift"],
  before: number,
  after: number,
): string {
  switch (shift) {
    case "novel":
      return `${label} emerged in the later period of observation history.`;
    case "increased":
      return `${label} signals increased from ${before} to ${after} records across the history span.`;
    case "decreased":
      return `${label} signals decreased from ${before} to ${after} records — a easing pattern over time.`;
    case "stable":
      return `${label} has remained relatively consistent (${before} → ${after} records).`;
  }
}
