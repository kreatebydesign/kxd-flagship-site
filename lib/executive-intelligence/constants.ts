/**
 * Phase 28A/28B — Canonical executive scoring and arbitration constants.
 * Documented weights. No unexplained magic numbers for founder-facing ranking.
 */

import type { DecisionClass, ExecutiveConfidence, ExecutiveUrgency } from "./types";

/** Higher = more urgent (canonical executive direction). */
export const EXECUTIVE_URGENCY_RANK: Record<ExecutiveUrgency, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Compatibility shim — inverted rank used by legacy intelligence callers
 * (lower = more urgent). Prefer EXECUTIVE_URGENCY_RANK for new code.
 * @deprecated Phase 28B — migrate callers to EXECUTIVE_URGENCY_RANK
 */
export const LEGACY_URGENCY_RANK_INVERTED: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const EXECUTIVE_CONFIDENCE_WEIGHT: Record<ExecutiveConfidence, number> = {
  high: 1,
  medium: 0.85,
  low: 0.65,
  unknown: 0.5,
};

/**
 * Within-class secondary score: leverage × urgency × confidence.
 * Documented: used only for tie-breaking inside the same DecisionClass.
 */
export function executiveRankScore(
  leverage: number,
  urgency: ExecutiveUrgency,
  confidence: ExecutiveConfidence,
): number {
  return leverage * EXECUTIVE_URGENCY_RANK[urgency] * EXECUTIVE_CONFIDENCE_WEIGHT[confidence];
}

/**
 * @deprecated Phase 28B — prefer DecisionClass arbitration.
 * Kept for verify parity and gradual migration of schedule-only callers.
 */
export const SCHEDULE_CANDIDATE_TIER = {
  recovery: 1000,
  conflict: 900,
  currentLinkedWork: 800,
  currentExternal: 750,
  nextSoon: 700,
  capacityOverrun: 650,
  overdueWithFocus: 600,
  focusBlockProtect: 550,
  openGap: 500,
  calm: 100,
} as const;

/**
 * @deprecated Phase 28B — prefer DecisionClass arbitration.
 */
export const PORTFOLIO_CANDIDATE_TIER = {
  websiteReviewNew: 580,
  websiteReviewActive: 570,
  communicationReply: 560,
  overdueWork: 550,
  highPriorityWork: 540,
  clientRequest: 530,
  calm: 100,
} as const;

/** Human labels for DecisionClass — used in explainability. */
export const DECISION_CLASS_PRIORITY: Record<DecisionClass, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};
