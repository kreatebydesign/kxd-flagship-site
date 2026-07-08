import type { BusinessBrainResult } from "@/lib/business-brain";
import type { PulseResult } from "@/lib/pulse";
import type { ExecutiveNarrativeInput, NarrativeTone } from "./types";

/**
 * Resolve overall narrative tone from Brain + Pulse context.
 */
export function resolveNarrativeTone(input: ExecutiveNarrativeInput): NarrativeTone {
  const { brain, pulse } = input;

  if (
    pulse.posture.level === "critical" ||
    brain.summary.criticalSignalCount > 0 ||
    pulse.executiveDigest.overallTone === "urgent"
  ) {
    return "urgent";
  }

  if (
    pulse.posture.level === "elevated" ||
    brain.summary.overallPosture === "strained" ||
    brain.summary.overallPosture === "pressured" ||
    pulse.executiveDigest.overallTone === "alert"
  ) {
    return "pressured";
  }

  if (
    pulse.watchlist.length >= 2 ||
    brain.attentionCount >= 2 ||
    pulse.changes.filter((c) => c.significance !== "low").length >= 2
  ) {
    return "attentive";
  }

  if (
    pulse.posture.level === "quiet" ||
    pulse.posture.level === "stable" ||
    pulse.executiveDigest.overallTone === "calm"
  ) {
    return "calm";
  }

  return "measured";
}

export function toneLabel(tone: NarrativeTone): string {
  const labels: Record<NarrativeTone, string> = {
    calm: "Calm",
    measured: "Measured",
    attentive: "Attentive",
    pressured: "Pressured",
    urgent: "Urgent",
  };
  return labels[tone];
}

export function postureToOpeningKey(
  posture: PulseResult["posture"]["level"],
): keyof typeof import("./templates").OPENING_TEMPLATES {
  return posture;
}

export function brainPosturePhrase(brain: BusinessBrainResult): string {
  switch (brain.summary.overallPosture) {
    case "clear":
      return "interpreted business posture is clear";
    case "active":
      return "interpreted business posture is active";
    case "pressured":
      return "interpreted business posture carries some pressure";
    case "strained":
      return "interpreted business posture is strained";
  }
}
