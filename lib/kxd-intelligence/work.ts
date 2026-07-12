import "server-only";

import { buildInsight } from "./contract";
import { runIntelligencePipeline } from "./pipeline";
import type {
  IntelligenceInsight,
  IntelligenceQueryContext,
  WorkIntelligenceView,
} from "./types";

/**
 * Work-scoped insight. Priority reasoning is architecture-only in 21B.
 */
export async function getWorkInsight(
  workId?: number | null,
  context: Omit<IntelligenceQueryContext, "workId"> = {},
): Promise<IntelligenceInsight | null> {
  const view = await getWorkIntelligenceView(workId, context);
  return view.insight;
}

export async function getWorkIntelligenceView(
  workId?: number | null,
  context: Omit<IntelligenceQueryContext, "workId"> = {},
): Promise<WorkIntelligenceView> {
  const bundle = await runIntelligencePipeline(
    {
      ...context,
      workId: workId ?? null,
      workspaceId: "work-engine",
      limit: 5,
    },
    { warmPipeline: false },
  );

  const matched =
    bundle.executive.find(
      (item) =>
        item.domain === "work" ||
        (workId != null && item.relatedWorkId === workId),
    ) ?? null;

  const insight =
    matched ??
    buildInsight({
      id: workId != null ? `work-arch-${workId}` : "work-arch-portfolio",
      domain: "work",
      title: "Work Engine ready for intelligence",
      whatHappened:
        "Work Engine data is available to the Intelligence Layer as a future source.",
      whyItMatters:
        "Overdue, blocking, client-risk, and priority questions should not be invented per page.",
      whatShouldHappenNext:
        "Continue operating Work Engine; Intelligence will answer priority questions in a later phase.",
      confidence: "low",
      urgency: "low",
      disposition: "remember",
      sourceIds: ["work-engine"],
      relatedWorkId: workId ?? null,
    });

  return {
    insight,
    isOverdue: null,
    isBlocking: null,
    clientAtRisk: null,
    canWait: null,
    shouldBeTodayPriority: null,
    openQuestions: [
      "Is this overdue?",
      "Is this blocking another task?",
      "Is another client at risk?",
      "Can this wait?",
      "Should this become today's priority?",
    ],
    architectureReady: true,
  };
}
