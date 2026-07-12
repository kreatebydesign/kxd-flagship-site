/**
 * Explanation helpers — "Why am I seeing this?"
 * Interfaces + builders only; UI consumption arrives later.
 */

import { buildExplanation } from "./contract";
import type {
  IntelligenceExplanation,
  IntelligenceInsight,
  IntelligenceRecommendation,
  OperationalWarning,
} from "./types";

export function explainInsight(insight: IntelligenceInsight): IntelligenceExplanation {
  if (insight.explanation) return insight.explanation;

  return buildExplanation({
    whyVisible: `KXD Intelligence surfaced “${insight.title}” for the current workspace.`,
    whyRecommended: insight.whyItMatters,
    influencingData: insight.sourceIds.map((sourceId) => ({
      sourceId,
      label: "Source",
      detail: sourceId,
    })),
    confidenceRationale: `Confidence is ${insight.confidence} based on available upstream systems.`,
    confidence: insight.confidence,
  });
}

export function explainRecommendation(
  recommendation: IntelligenceRecommendation,
): IntelligenceExplanation {
  if (recommendation.explanation) return recommendation.explanation;

  return buildExplanation({
    whyVisible: `This recommendation appears because: ${recommendation.reason}`,
    whyRecommended: recommendation.suggestedAction,
    influencingData: recommendation.sourceIds.map((sourceId) => ({
      sourceId,
      label: "Source",
      detail: sourceId,
    })),
    confidenceRationale: `Confidence is ${recommendation.confidence}.`,
    confidence: recommendation.confidence,
  });
}

export function explainWarning(warning: OperationalWarning): IntelligenceExplanation {
  if (warning.explanation) return warning.explanation;

  return buildExplanation({
    whyVisible: warning.whatHappened,
    whyRecommended: warning.whyItMatters,
    influencingData: warning.sourceIds.map((sourceId) => ({
      sourceId,
      label: "Source",
      detail: sourceId,
    })),
    confidenceRationale: `Confidence is ${warning.confidence}.`,
    confidence: warning.confidence,
  });
}

export type IntelligenceExplanationQuestion =
  | "why-visible"
  | "why-recommended"
  | "influencing-data"
  | "confidence";

export function answerExplanationQuestion(
  explanation: IntelligenceExplanation,
  question: IntelligenceExplanationQuestion,
): string {
  switch (question) {
    case "why-visible":
      return explanation.whyVisible;
    case "why-recommended":
      return explanation.whyRecommended;
    case "influencing-data":
      return explanation.influencingData
        .map((item) => `${item.label}: ${item.detail}`)
        .join(" · ");
    case "confidence":
      return `${explanation.confidence} — ${explanation.confidenceRationale}`;
    default:
      return explanation.whyVisible;
  }
}
