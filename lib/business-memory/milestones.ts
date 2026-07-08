import { taxonomyLabel } from "@/lib/business-brain";
import type { BusinessMilestone, BusinessMemoryInput } from "./types";
import { fingerprintToTaxonomy, memoryId } from "./utils";

/**
 * Derive milestones from repeated observations, brain patterns, and pulse shifts.
 */
export function buildBusinessMilestones(input: BusinessMemoryInput): BusinessMilestone[] {
  const milestones: BusinessMilestone[] = [];

  for (const entry of input.repeated.filter((r) => r.count >= 3).slice(0, 6)) {
    const taxonomy = fingerprintToTaxonomy(entry.fingerprint, entry.latest.source);
    milestones.push({
      id: memoryId("milestone", `repeated:${entry.fingerprint}`),
      label: `Repeated signal: ${taxonomyLabel(taxonomy)}`,
      description: `${entry.latest.fact} — observed ${entry.count} times in history.`,
      occurredAt: entry.latest.recordedAt,
      source: "observation",
      observationFingerprints: [entry.fingerprint],
      taxonomy,
    });
  }

  for (const pattern of input.brain.patterns
    .filter((p) => p.trend === "repeated" || p.trend === "novel")
    .slice(0, 5)) {
    milestones.push({
      id: memoryId("milestone", pattern.id),
      label: pattern.label,
      description: pattern.description,
      occurredAt: input.pulse.generatedAt,
      source: "pattern",
      observationFingerprints: pattern.observationFingerprints,
      taxonomy: pattern.taxonomy,
    });
  }

  const meaningfulChanges = input.pulse.changes.filter(
    (c) => c.significance !== "low" && c.direction !== "unchanged",
  );
  for (const change of meaningfulChanges.slice(0, 3)) {
    if (change.taxonomy === "observation.novel") continue;
    milestones.push({
      id: memoryId("milestone", change.id),
      label: change.label,
      description: change.description,
      occurredAt: input.pulse.generatedAt,
      source: "pulse",
      observationFingerprints: change.observationFingerprints,
      taxonomy: change.taxonomy,
    });
  }

  const seen = new Set<string>();
  return milestones
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .slice(0, 10);
}
