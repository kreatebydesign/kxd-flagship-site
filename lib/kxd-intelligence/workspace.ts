import "server-only";

import { runIntelligencePipeline } from "./pipeline";
import type {
  IntelligenceInsight,
  IntelligenceQueryContext,
  IntelligenceWorkspaceId,
} from "./types";

/**
 * Workspace-scoped insight — prepare surfaces without redesigning them.
 */
export async function getWorkspaceInsight(
  workspaceId: IntelligenceWorkspaceId,
  context: Omit<IntelligenceQueryContext, "workspaceId"> = {},
): Promise<IntelligenceInsight | null> {
  const bundle = await runIntelligencePipeline(
    { ...context, workspaceId, limit: context.limit ?? 5 },
    { warmPipeline: workspaceId === "morning-brief" },
  );

  const preferredDomain =
    workspaceId === "work-engine"
      ? "work"
      : workspaceId === "client-success"
        ? "client"
        : workspaceId === "operations-experience"
          ? "learning"
          : workspaceId === "activity-center"
            ? "activity"
            : workspaceId === "website-review"
              ? "review"
              : "executive";

  const match = bundle.executive.find((insight) => insight.domain === preferredDomain);
  return match ?? bundle.executive[0] ?? null;
}
