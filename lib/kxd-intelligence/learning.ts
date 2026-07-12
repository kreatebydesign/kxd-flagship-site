import "server-only";

import { buildInsight } from "./contract";
import { runIntelligencePipeline } from "./pipeline";
import type {
  IntelligenceInsight,
  IntelligenceQueryContext,
  LearningIntelligenceView,
} from "./types";

/**
 * Learning insight for Operations Experience.
 * Adaptive learning is not implemented — architecture only.
 */
export async function getLearningInsight(
  context: IntelligenceQueryContext = {},
): Promise<IntelligenceInsight | null> {
  const view = await getLearningIntelligenceView(context);
  return view.insight;
}

export async function getLearningIntelligenceView(
  context: IntelligenceQueryContext = {},
): Promise<LearningIntelligenceView> {
  await runIntelligencePipeline(
    { ...context, workspaceId: "operations-experience", limit: 3 },
    { warmPipeline: false },
  );

  const insight = buildInsight({
    id: "learning-architecture",
    domain: "learning",
    title: "Operations Experience ready for intelligence",
    whatHappened:
      context.lessonSlug
        ? `Learner is in lesson “${context.lessonSlug}”.`
        : "Learner is in Operations Experience.",
    whyItMatters:
      "Training should eventually ask Intelligence where the learner is struggling — not invent local advice.",
    whatShouldHappenNext:
      "Continue the path. Adaptive next-lesson and Matt-notify rules arrive in a later phase.",
    confidence: "low",
    urgency: "low",
    disposition: "remember",
    sourceIds: ["training-progress"],
  });

  return {
    insight,
    strugglingAreas: [],
    suggestedNextLesson: null,
    showAdditionalGuidance: false,
    notifyMatt: false,
    rationale:
      "Phase 21B establishes the learning contract. Progress signals will feed this view later.",
    architectureReady: true,
  };
}
