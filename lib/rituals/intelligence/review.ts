import { summarizeBusinessContext } from "@/lib/business-context";
import type { RitualIntelligenceBundle, WeeklyReviewIntelligence } from "./types";

/**
 * Build Weekly Review intelligence from Pulse, Brain patterns, and Narrative.
 */
export function buildWeeklyReviewIntelligence(
  bundle: RitualIntelligenceBundle,
): WeeklyReviewIntelligence {
  const { narrative, context, brain, pulse } = bundle;

  const meaningfulChanges = pulse.changes
    .filter((change) => change.direction !== "unchanged" && change.significance !== "low")
    .slice(0, 6)
    .map((change) => change.description);

  if (meaningfulChanges.length === 0 && pulse.executiveDigest.topChanges.length > 0) {
    meaningfulChanges.push(...pulse.executiveDigest.topChanges.slice(0, 4));
  }

  const patterns = brain.patterns.slice(0, 6).map((pattern) => ({
    id: pattern.id,
    label: pattern.label,
    description: pattern.description,
  }));

  const stableAreas = [
    ...pulse.stableSignals.slice(0, 4).map((s) => s.label),
    ...narrative.stability.sentences.slice(0, 2),
  ].filter((item, index, arr) => arr.indexOf(item) === index);

  const movementNarrative = [
    narrative.changes.paragraphs[0],
    narrative.businessState.paragraphs[0],
    narrative.closing.paragraphs[0],
  ].filter(Boolean) as string[];

  return {
    contextSummary: summarizeBusinessContext(context),
    postureLabel: pulse.posture.label,
    meaningfulChanges,
    patterns,
    stableAreas,
    movementNarrative,
  };
}
