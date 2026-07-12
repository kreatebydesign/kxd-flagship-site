import "server-only";

import { runIntelligencePipeline } from "./pipeline";
import type {
  IntelligenceQueryContext,
  IntelligenceRecommendation,
} from "./types";

/**
 * Primary recommendation for the current context.
 * Always includes a reason via IntelligenceRecommendation.reason.
 */
export async function getRecommendation(
  context: IntelligenceQueryContext = {},
): Promise<IntelligenceRecommendation | null> {
  const bundle = await runIntelligencePipeline(context, {
    warmPipeline: context.workspaceId === "morning-brief",
  });
  return bundle.recommendations[0] ?? null;
}

export async function getRecommendations(
  context: IntelligenceQueryContext = {},
): Promise<IntelligenceRecommendation[]> {
  const bundle = await runIntelligencePipeline(context, {
    warmPipeline: false,
  });
  return bundle.recommendations;
}
