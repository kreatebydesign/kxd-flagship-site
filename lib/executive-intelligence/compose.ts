/**
 * Phase 28A — Executive Intelligence Engine entry point.
 * Evidence → Interpretation → Decision → Recommendation → Narrative Input
 */

import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import { buildOperatingPicture } from "./decide";
import { collectEvidence, type ScheduleEvidenceInput } from "./evidence";
import { interpretEvidence } from "./interpret";
import { buildNarrativeInput } from "./narrative";
import { buildExplainabilityPath, selectPrimaryRecommendation } from "./recommend";
import type { ExecutiveIntelligenceSurface } from "./types";

export interface ComposeExecutiveIntelligenceInput {
  observedAt?: string;
  briefing?: BriefingInputContext | null;
  schedule?: ScheduleEvidenceInput | null;
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
  });

  const interpretations = interpretEvidence(evidence);
  const decision = buildOperatingPicture({
    evidence,
    interpretations,
    schedule: input.schedule,
  });

  const recommendation = selectPrimaryRecommendation({
    evidence,
    interpretations,
    decision,
    schedule: input.schedule,
  });

  const { decisionPath, confidenceRationale } = buildExplainabilityPath(
    evidence,
    interpretations,
    decision,
    recommendation,
  );

  const narrativeInput = buildNarrativeInput({
    evidence,
    decision,
    recommendation,
    capacitySummary: input.schedule?.capacity?.summary ?? null,
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
    },
    generatedAt: observedAt,
  };
}
