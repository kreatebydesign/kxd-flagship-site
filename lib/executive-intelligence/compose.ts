/**
 * Phase 28B — Executive Intelligence Engine entry point.
 * Evidence → Interpretation → Decision → Recommendation → Narrative Input
 */

import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import { buildOperatingPicture } from "./decide";
import {
  collectEvidence,
  type ScheduleEvidenceInput,
  type SignalEvidenceSource,
} from "./evidence";
import { interpretEvidence } from "./interpret";
import { buildNarrativeInput } from "./narrative";
import {
  buildExplainabilityPath,
  buildUserFacingExplainability,
  selectPrimaryRecommendation,
} from "./recommend";
import type { ExecutiveIntelligenceSurface } from "./types";
import { DECISION_CLASS_LABEL } from "./types";

export interface ComposeExecutiveIntelligenceInput {
  observedAt?: string;
  briefing?: BriefingInputContext | null;
  schedule?: ScheduleEvidenceInput | null;
  signals?: SignalEvidenceSource[] | null;
  calendarAvailable?: boolean | null;
}

/**
 * Deterministic executive reasoning pipeline.
 * No database access. No AI. Safe for tests and server loaders.
 */
export function composeExecutiveIntelligence(
  input: ComposeExecutiveIntelligenceInput = {},
): ExecutiveIntelligenceSurface {
  const observedAt = input.observedAt ?? new Date(0).toISOString();

  const evidence = collectEvidence({
    observedAt,
    briefing: input.briefing,
    schedule: input.schedule,
    signals: input.signals,
    calendarAvailable: input.calendarAvailable,
  });

  const interpretations = interpretEvidence(evidence);
  const decision = buildOperatingPicture({
    evidence,
    interpretations,
    schedule: input.schedule,
    hasBriefing: Boolean(input.briefing),
  });

  const { recommendation, outranked } = selectPrimaryRecommendation({
    evidence,
    interpretations,
    decision,
    schedule: input.schedule,
  });

  // Align recommendation confidence with operating-picture assessment
  recommendation.confidence = decision.confidence;

  const { decisionPath, confidenceRationale, missingEvidence, freshness } =
    buildExplainabilityPath(evidence, interpretations, decision, recommendation);

  const userExplainability = buildUserFacingExplainability({
    recommendation,
    confidence: decision.confidence,
    confidenceReasons: decision.confidenceReasons,
    evidence,
    freshness,
    missingEvidence,
  });

  const narrativeInput = buildNarrativeInput({
    evidence,
    decision,
    recommendation,
    capacitySummary: input.schedule?.capacity?.summary ?? null,
    freshness,
  });

  return {
    evidence,
    interpretations,
    decision,
    recommendation,
    narrativeInput,
    explainability: {
      evidence,
      interpretations,
      decisionPath,
      confidenceRationale,
      confidenceReasons: decision.confidenceReasons,
      decisionClass: recommendation.decisionClass,
      decisionClassLabel: DECISION_CLASS_LABEL[recommendation.decisionClass],
      outranked,
      missingEvidence,
      tradeoff: recommendation.tradeoff ?? null,
      expectedImpact: recommendation.expectedImpact ?? null,
      freshness,
    },
    userExplainability,
    generatedAt: observedAt,
  };
}
