/**
 * Insight builders — enforce the Intelligence Contract.
 */

import type {
  IntelligenceConfidence,
  IntelligenceDisposition,
  IntelligenceDomain,
  IntelligenceEvidenceItem,
  IntelligenceExplanation,
  IntelligenceInsight,
  IntelligenceRecommendation,
  IntelligenceSourceId,
  IntelligenceUrgency,
  OperationalWarning,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function buildExplanation(input: {
  whyVisible: string;
  whyRecommended: string;
  influencingData: IntelligenceEvidenceItem[];
  confidenceRationale: string;
  confidence: IntelligenceConfidence;
}): IntelligenceExplanation {
  return {
    whyVisible: input.whyVisible,
    whyRecommended: input.whyRecommended,
    influencingData: input.influencingData,
    confidenceRationale: input.confidenceRationale,
    confidence: input.confidence,
  };
}

export function buildInsight(input: {
  id: string;
  domain: IntelligenceDomain;
  title: string;
  whatHappened: string;
  whyItMatters: string;
  whatShouldHappenNext: string;
  confidence: IntelligenceConfidence;
  urgency: IntelligenceUrgency;
  disposition?: IntelligenceDisposition;
  sourceIds: IntelligenceSourceId[];
  relatedClientId?: number | null;
  relatedWorkId?: number | null;
  relatedHref?: string | null;
  explanation?: IntelligenceExplanation | null;
}): IntelligenceInsight {
  const disposition =
    input.disposition ??
    (input.urgency === "critical" || input.urgency === "high"
      ? "act-now"
      : input.urgency === "medium"
        ? "consider"
        : "monitor");

  const shouldActNow =
    disposition === "act-now" &&
    (input.confidence === "high" || input.confidence === "medium");

  return {
    id: input.id,
    domain: input.domain,
    title: input.title,
    whatHappened: input.whatHappened,
    whyItMatters: input.whyItMatters,
    whatShouldHappenNext: input.whatShouldHappenNext,
    confidence: input.confidence,
    urgency: input.urgency,
    disposition,
    shouldActNow,
    shouldRemember: disposition === "remember" || disposition === "monitor",
    sourceIds: input.sourceIds,
    relatedClientId: input.relatedClientId ?? null,
    relatedWorkId: input.relatedWorkId ?? null,
    relatedHref: input.relatedHref ?? null,
    explanation: input.explanation ?? null,
    generatedAt: nowIso(),
  };
}

export function buildRecommendation(input: {
  id: string;
  title: string;
  reason: string;
  suggestedAction: string;
  confidence: IntelligenceConfidence;
  urgency: IntelligenceUrgency;
  sourceIds: IntelligenceSourceId[];
  relatedClientId?: number | null;
  relatedHref?: string | null;
  explanation?: IntelligenceExplanation | null;
  shouldActNow?: boolean;
}): IntelligenceRecommendation {
  return {
    id: input.id,
    title: input.title,
    reason: input.reason,
    suggestedAction: input.suggestedAction,
    confidence: input.confidence,
    urgency: input.urgency,
    shouldActNow:
      input.shouldActNow ??
      ((input.urgency === "critical" || input.urgency === "high") &&
        input.confidence !== "low"),
    sourceIds: input.sourceIds,
    relatedClientId: input.relatedClientId ?? null,
    relatedHref: input.relatedHref ?? null,
    explanation: input.explanation ?? null,
    generatedAt: nowIso(),
  };
}

export function buildWarning(input: {
  id: string;
  title: string;
  whatHappened: string;
  whyItMatters: string;
  whatShouldHappenNext: string;
  confidence: IntelligenceConfidence;
  urgency: IntelligenceUrgency;
  sourceIds: IntelligenceSourceId[];
  relatedClientId?: number | null;
  relatedHref?: string | null;
  explanation?: IntelligenceExplanation | null;
  shouldActNow?: boolean;
}): OperationalWarning {
  return {
    id: input.id,
    title: input.title,
    whatHappened: input.whatHappened,
    whyItMatters: input.whyItMatters,
    whatShouldHappenNext: input.whatShouldHappenNext,
    confidence: input.confidence,
    urgency: input.urgency,
    shouldActNow:
      input.shouldActNow ??
      (input.urgency === "critical" || input.urgency === "high"),
    sourceIds: input.sourceIds,
    relatedClientId: input.relatedClientId ?? null,
    relatedHref: input.relatedHref ?? null,
    explanation: input.explanation ?? null,
    generatedAt: nowIso(),
  };
}

export function urgencyRank(urgency: IntelligenceUrgency): number {
  switch (urgency) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

export function confidenceRank(confidence: IntelligenceConfidence): number {
  switch (confidence) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

/** Calm cap — never overwhelm a workspace surface. */
export const INTELLIGENCE_SURFACE_LIMIT = 5;
