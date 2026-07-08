import type { BusinessBrainSummary, BusinessPattern, BusinessSignal, ExecutiveAttentionItem } from "./types";
import { dominantThemes } from "./attention";

/**
 * Synthesize a calm business brain summary from signals, patterns, and attention.
 */
export function buildBusinessBrainSummary(
  signals: BusinessSignal[],
  patterns: BusinessPattern[],
  attention: ExecutiveAttentionItem[],
): BusinessBrainSummary {
  const criticalSignalCount = signals.filter((s) => s.severity === "critical").length;
  const positiveSignalCount = signals.filter((s) => s.severity === "positive").length;
  const highPressure = signals.filter(
    (s) => s.severity === "critical" || s.severity === "high",
  ).length;

  const themes = dominantThemes(signals);

  let overallPosture: BusinessBrainSummary["overallPosture"];
  if (criticalSignalCount > 0 || attention.some((a) => a.severity === "critical")) {
    overallPosture = "strained";
  } else if (highPressure >= 3 || attention.length >= 4) {
    overallPosture = "pressured";
  } else if (signals.length > 0 || patterns.length > 0) {
    overallPosture = "active";
  } else {
    overallPosture = "clear";
  }

  let headline: string;
  let narrative: string;

  switch (overallPosture) {
    case "clear":
      headline = "The portfolio is calm.";
      narrative =
        "Observations show no significant business pressure across connected systems. Execution posture is clear.";
      break;
    case "active":
      headline = "Business activity is present and understood.";
      narrative =
        themes.length > 0
          ? `The Business Brain has interpreted ${signals.length} signal${signals.length === 1 ? "" : "s"} across ${themes.join(", ")}. Nothing requires immediate alarm.`
          : "Observations are being interpreted into structured business understanding.";
      break;
    case "pressured":
      headline = "Some areas are carrying pressure.";
      narrative = `${attention.length} area${attention.length === 1 ? "" : "s"} may deserve human review. ${themes.slice(0, 3).join(", ")} ${themes.length === 1 ? "is" : "are"} the dominant themes.`;
      break;
    case "strained":
      headline = "Elevated pressure is visible in the portfolio.";
      narrative = `Critical or high-severity signals are present. ${attention.length} attention item${attention.length === 1 ? "" : "s"} surfaced for calm executive review — not as recommendations.`;
      break;
  }

  if (positiveSignalCount > 0 && overallPosture !== "strained") {
    narrative += " Execution momentum is also present.";
  }

  if (patterns.some((p) => p.trend === "repeated")) {
    narrative += " Some patterns are repeating across observation history.";
  }

  return {
    headline,
    narrative,
    dominantThemes: themes,
    overallPosture,
    criticalSignalCount,
    positiveSignalCount,
  };
}
