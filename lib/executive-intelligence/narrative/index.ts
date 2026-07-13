/**
 * Phase 28B — Structured narrative input (no prose generation).
 * Narrative must never override the decision.
 */

import type {
  EvidenceItem,
  NarrativeInput,
  OperatingPicture,
  PrimaryRecommendation,
} from "../types";

export function buildNarrativeInput(input: {
  evidence: EvidenceItem[];
  decision: OperatingPicture;
  recommendation: PrimaryRecommendation;
  capacitySummary?: string | null;
  freshness?: string;
}): NarrativeInput {
  const riskSignals = input.evidence
    .filter((e) =>
      [
        "schedule_recovery",
        "schedule_conflict",
        "capacity_overrun",
        "overdue_work",
        "blocked_work",
        "communication_needs_reply",
      ].includes(e.kind),
    )
    .slice(0, 5)
    .map((e) => e.summary);

  const opportunitySignals = input.evidence
    .filter((e) =>
      [
        "focus_block_available",
        "open_focus_gap",
        "website_review_new",
        "high_priority_work",
      ].includes(e.kind),
    )
    .slice(0, 5)
    .map((e) => e.summary);

  return {
    posture: input.decision.posture,
    scheduleMaterial: input.decision.scheduleMaterial,
    primaryAction: input.recommendation.action,
    primaryReason: input.recommendation.reasoning,
    riskSignals,
    opportunitySignals,
    capacitySummary: input.capacitySummary ?? null,
    evidenceHighlights: input.evidence.slice(0, 8).map((e) => ({
      id: e.id,
      summary: e.summary,
    })),
    confidence: input.decision.confidence,
    tradeoff: input.recommendation.tradeoff ?? null,
    freshness: input.freshness ?? "Evidence is current",
  };
}
