/**
 * Phase 28A — Canonical executive scoring constants.
 * Single source for urgency ranking across executive surfaces.
 */

import type { ExecutiveConfidence, ExecutiveUrgency } from "./types";

export const EXECUTIVE_URGENCY_RANK: Record<ExecutiveUrgency, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const EXECUTIVE_CONFIDENCE_WEIGHT: Record<ExecutiveConfidence, number> = {
  high: 1,
  medium: 0.85,
  low: 0.65,
};

export function executiveRankScore(
  leverage: number,
  urgency: ExecutiveUrgency,
  confidence: ExecutiveConfidence,
): number {
  return leverage * EXECUTIVE_URGENCY_RANK[urgency] * EXECUTIVE_CONFIDENCE_WEIGHT[confidence];
}

/** Candidate tier — higher wins when schedule is material. */
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

/** Candidate tier — used when schedule is not material. */
export const PORTFOLIO_CANDIDATE_TIER = {
  websiteReviewNew: 580,
  websiteReviewActive: 570,
  communicationReply: 560,
  overdueWork: 550,
  highPriorityWork: 540,
  clientRequest: 530,
  calm: 100,
} as const;
