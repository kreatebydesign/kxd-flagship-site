/**
 * Confidence Engine (P0-E).
 * Confidence depends on evidence quality — not intuition.
 */

import type {
  HealthConfidence,
  HealthConfidenceRule,
  HealthScoreObservation,
} from "./types";

export const HEALTH_CONFIDENCE_RULES: HealthConfidenceRule[] = [
  {
    confidence: "high",
    minEvidenceKinds: 2,
    minEvidenceIds: 3,
    requiresDecisionLink: true,
    description:
      "High confidence requires multiple evidence kinds, ≥3 evidence IDs, and at least one Decision link.",
  },
  {
    confidence: "medium",
    minEvidenceKinds: 1,
    minEvidenceIds: 2,
    requiresDecisionLink: false,
    description:
      "Medium confidence requires ≥2 evidence IDs from at least one structured evidence kind.",
  },
  {
    confidence: "low",
    minEvidenceKinds: 1,
    minEvidenceIds: 1,
    requiresDecisionLink: false,
    description:
      "Low confidence is allowed for early observations with a single evidence ID — still not intuition.",
  },
];

export interface ConfidenceEvaluationInput {
  evidenceIds: string[];
  evidenceKinds: string[];
  decisionIds: string[];
}

/**
 * Resolve the highest confidence level the evidence pack supports.
 * Returns null if evidence is insufficient for even low confidence.
 */
export function resolveHealthConfidence(
  input: ConfidenceEvaluationInput,
): HealthConfidence | null {
  const kindCount = new Set(input.evidenceKinds.filter(Boolean)).size;
  const evidenceCount = input.evidenceIds.filter(Boolean).length;
  const hasDecision = input.decisionIds.filter(Boolean).length > 0;

  const ordered = [...HEALTH_CONFIDENCE_RULES].sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[b.confidence] - rank[a.confidence];
  });

  for (const rule of ordered) {
    if (evidenceCount < rule.minEvidenceIds) continue;
    if (kindCount < rule.minEvidenceKinds) continue;
    if (rule.requiresDecisionLink && !hasDecision) continue;
    return rule.confidence;
  }
  return null;
}

/**
 * A scored observation without confidence is incomplete.
 */
export function observationHasValidConfidence(
  observation: HealthScoreObservation,
): boolean {
  if (observation.currentValue === null) {
    return observation.confidence === null;
  }
  return (
    observation.confidence === "high" ||
    observation.confidence === "medium" ||
    observation.confidence === "low"
  );
}
