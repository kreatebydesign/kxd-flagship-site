import { taxonomyLabel } from "@/lib/business-brain";
import type { BusinessMemoryInput, BusinessTrend, BusinessTrendDirection } from "./types";
import { fingerprintToTaxonomy, memoryId } from "./utils";

function directionFromPattern(
  trend: import("@/lib/business-brain").BusinessPatternTrend,
  count: number,
): BusinessTrendDirection {
  switch (trend) {
    case "increasing":
      return "declining";
    case "decreasing":
      return "improving";
    case "stable":
      return "stable";
    case "novel":
      return "emerging";
    case "repeated":
      return count >= 4 ? "declining" : "stable";
  }
}

function directionFromFingerprint(
  fingerprint: string,
  count: number,
  isStable: boolean,
): BusinessTrendDirection {
  if (isStable) return "stable";
  if (count === 1) return "emerging";
  const lower = fingerprint.toLowerCase();
  if (lower.includes("completed") || lower.includes(":clear")) return "improving";
  if (lower.includes("blocked") || lower.includes("due-soon") || lower.includes("stale")) {
    return count >= 3 ? "declining" : "emerging";
  }
  return count >= 3 ? "stable" : "emerging";
}

/**
 * Derive business trends from observation history and brain patterns.
 */
export function buildBusinessTrends(input: BusinessMemoryInput): BusinessTrend[] {
  const trends: BusinessTrend[] = [];
  const stableFingerprints = new Set(input.stable.map((obs) => obs.fingerprint));

  for (const pattern of input.brain.patterns.slice(0, 8)) {
    trends.push({
      id: memoryId("trend", pattern.id),
      label: pattern.label,
      description: pattern.description,
      direction: directionFromPattern(pattern.trend, pattern.occurrenceCount),
      taxonomy: pattern.taxonomy,
      occurrenceCount: pattern.occurrenceCount,
      observationFingerprints: pattern.observationFingerprints,
    });
  }

  for (const entry of input.repeated.slice(0, 8)) {
    const taxonomy = fingerprintToTaxonomy(entry.fingerprint, entry.latest.source);
    if (trends.some((t) => t.taxonomy === taxonomy && t.occurrenceCount === entry.count)) {
      continue;
    }
    trends.push({
      id: memoryId("trend", `repeated:${entry.fingerprint}`),
      label: `${taxonomyLabel(taxonomy)} trend`,
      description: `${entry.latest.fact} — appearing across ${entry.count} observation records.`,
      direction: directionFromFingerprint(
        entry.fingerprint,
        entry.count,
        stableFingerprints.has(entry.fingerprint),
      ),
      taxonomy,
      occurrenceCount: entry.count,
      observationFingerprints: [entry.fingerprint],
    });
  }

  const seen = new Set<string>();
  return trends
    .filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    })
    .slice(0, 10);
}
