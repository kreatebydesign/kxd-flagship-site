import type { IntelligenceConfidence } from "../types";
import type { RecommendationCategory } from "./types";

export function confidenceDisplayLabel(confidence: IntelligenceConfidence): string {
  switch (confidence) {
    case "high":
      return "High Confidence";
    case "medium":
      return "Medium Confidence";
    case "low":
      return "Low Confidence";
  }
}

export function categoryDisplayLabel(category: RecommendationCategory): string {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function insightToneLabel(tone: import("./types").ExecutiveInsightTone): string {
  switch (tone) {
    case "positive":
      return "Progress";
    case "observational":
      return "Observation";
    case "quiet":
      return "Steady";
    case "neutral":
      return "Note";
  }
}
