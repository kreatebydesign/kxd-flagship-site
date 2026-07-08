import type { BusinessBrainResult } from "@/lib/business-brain";
import type { BusinessPosture, BusinessPostureLevel, PulseChange, PulseInput } from "./types";

const POSTURE_LABELS: Record<BusinessPostureLevel, string> = {
  quiet: "Quiet",
  stable: "Stable",
  active: "Active",
  busy: "Busy",
  elevated: "Elevated",
  critical: "Critical",
};

/**
 * Produce one overall descriptive business posture.
 */
export function buildBusinessPosture(
  brain: BusinessBrainResult,
  changes: PulseChange[],
  input: PulseInput,
): BusinessPosture {
  const criticalSignals = brain.signals.filter((s) => s.severity === "critical").length;
  const highSignals = brain.signals.filter((s) => s.severity === "high").length;
  const meaningfulChanges = changes.filter(
    (c) => c.direction !== "unchanged" && c.significance !== "low",
  ).length;
  const stableCount = input.stable.length;

  let level: BusinessPostureLevel;

  if (criticalSignals > 0 || brain.summary.overallPosture === "strained") {
    level = "critical";
  } else if (
    highSignals >= 2 ||
    brain.summary.overallPosture === "pressured" ||
    meaningfulChanges >= 4
  ) {
    level = "elevated";
  } else if (brain.signalCount >= 5 || brain.attentionCount >= 3) {
    level = "busy";
  } else if (stableCount >= 3 && meaningfulChanges === 0 && brain.signalCount > 0) {
    level = "stable";
  } else if (brain.signalCount === 0 && brain.observationCount < 10) {
    level = "quiet";
  } else if (brain.signalCount > 0 || meaningfulChanges > 0) {
    level = "active";
  } else {
    level = "stable";
  }

  const description = describePosture(level, brain, meaningfulChanges, stableCount);

  return {
    level,
    label: POSTURE_LABELS[level],
    description,
  };
}

function describePosture(
  level: BusinessPostureLevel,
  brain: BusinessBrainResult,
  meaningfulChanges: number,
  stableCount: number,
): string {
  switch (level) {
    case "quiet":
      return "Business activity is quiet today. Few observations and no significant signals.";
    case "stable":
      return `Executive state is stable. ${stableCount > 0 ? `${stableCount} areas are holding steady across recent runs.` : "Patterns are consistent with the previous pulse."}`;
    case "active":
      return `Business is active with ${brain.signalCount} interpreted signal${brain.signalCount === 1 ? "" : "s"}. ${meaningfulChanges > 0 ? `${meaningfulChanges} change${meaningfulChanges === 1 ? "" : "s"} since the last pulse.` : "Movement is present but measured."}`;
    case "busy":
      return `Multiple domains are active. ${brain.signalCount} signals and ${brain.attentionCount} attention area${brain.attentionCount === 1 ? "" : "s"} shape the current executive state.`;
    case "elevated":
      return "Pressure is elevated in one or more domains. Awareness is warranted — not alarm.";
    case "critical":
      return "Critical signals are present in the portfolio. Executive awareness is heightened.";
  }
}
