import type { FocusIntelligence, RitualIntelligenceBundle } from "./types";

/**
 * Build Focus Mode awareness from Pulse + Brain — descriptive only, no recommendations.
 */
export function buildFocusIntelligence(bundle: RitualIntelligenceBundle): FocusIntelligence {
  const { narrative, pulse, brain } = bundle;

  const domains = pulse.priorities.slice(0, 5).map((priority) => ({
    id: priority.id,
    title: priority.label,
    context: priority.context,
  }));

  const attentionAreas = [
    ...brain.attention.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      context: item.context,
    })),
    ...pulse.watchlist.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.label,
      context: item.context,
    })),
  ].filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

  const executionLandscape =
    narrative.businessState.paragraphs[0] ??
    pulse.executiveDigest.narrative ??
    "Execution landscape is being interpreted from current business signals.";

  return {
    postureLabel: pulse.posture.label,
    postureDescription: pulse.posture.description,
    domains,
    attentionAreas: attentionAreas.slice(0, 5),
    executionLandscape,
  };
}
