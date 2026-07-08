import type {
  BusinessPosture,
  ExecutiveDigest,
  ExecutiveDigestTone,
  PulseChange,
  PulseWatchItem,
  StableSignal,
} from "./types";

function resolveTone(posture: BusinessPosture): ExecutiveDigestTone {
  switch (posture.level) {
    case "critical":
      return "urgent";
    case "elevated":
    case "busy":
      return "alert";
    case "active":
      return "neutral";
    case "stable":
    case "quiet":
      return "calm";
  }
}

/**
 * Produce a structured executive digest — foundation for future Morning Brief.
 */
export function buildExecutiveDigest(
  posture: BusinessPosture,
  changes: PulseChange[],
  watchlist: PulseWatchItem[],
  stableSignals: StableSignal[],
): ExecutiveDigest {
  const tone = resolveTone(posture);
  const topChanges = changes
    .filter((c) => c.direction !== "unchanged")
    .slice(0, 5)
    .map((c) => c.description);

  const watchItems = watchlist.slice(0, 5).map((w) => w.label);
  const stableAreas = stableSignals.slice(0, 5).map((s) => s.label);

  let headline: string;
  let narrative: string;

  switch (posture.level) {
    case "quiet":
      headline = "Business is quiet today.";
      narrative =
        topChanges.length > 0
          ? `The studio is in a quiet posture. ${topChanges[0]}`
          : "No significant movement detected. The executive landscape is calm.";
      break;
    case "stable":
      headline = "Business posture is stable.";
      narrative =
        stableAreas.length > 0
          ? `Steady state across ${stableAreas.slice(0, 2).join(" and ")}. ${topChanges.length > 0 ? topChanges[0] : "No urgent shifts since the last pulse."}`
          : "Patterns are holding. The portfolio is in a stable executive posture.";
      break;
    case "active":
      headline = "Business is active.";
      narrative =
        topChanges.length > 0
          ? `${topChanges.slice(0, 2).join(" ")} ${watchItems.length > 0 ? `${watchItems[0]} remains on the watchlist.` : ""}`
          : "Activity is present across connected systems. Nothing requires immediate alarm.";
      break;
    case "busy":
      headline = "A busy executive day.";
      narrative = `${topChanges.length > 0 ? topChanges[0] : "Multiple domains are active."} ${watchItems.length > 0 ? `${watchItems.length} area${watchItems.length === 1 ? "" : "s"} on the watchlist.` : ""}`;
      break;
    case "elevated":
      headline = "Elevated awareness warranted.";
      narrative = `${topChanges.length > 0 ? topChanges[0] : "Pressure is visible in the portfolio."} ${watchItems.length > 0 ? `Continuing watch: ${watchItems[0]}.` : ""}`;
      break;
    case "critical":
      headline = "Critical executive signals present.";
      narrative = `${topChanges.length > 0 ? topChanges[0] : "Critical signals are visible."} Heightened awareness — descriptive only, not prescriptive.`;
      break;
  }

  if (topChanges.length >= 3 && posture.level !== "critical") {
    narrative += " Multiple meaningful changes occurred.";
  }

  return {
    headline,
    narrative: narrative.trim(),
    topChanges,
    watchItems,
    stableAreas,
    overallTone: tone,
  };
}
