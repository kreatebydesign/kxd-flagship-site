import "server-only";

import { INTELLIGENCE_SURFACE_LIMIT } from "./contract";
import { runIntelligencePipeline } from "./pipeline";
import type {
  IntelligenceInsight,
  IntelligenceQueryContext,
} from "./types";

/**
 * Top-line executive insight — what is most helpful to surface right now.
 */
export async function getExecutiveInsight(
  context: IntelligenceQueryContext = {},
): Promise<IntelligenceInsight | null> {
  const bundle = await runIntelligencePipeline(
    { ...context, limit: context.limit ?? INTELLIGENCE_SURFACE_LIMIT },
    { warmPipeline: true },
  );
  return bundle.executive[0] ?? null;
}

export async function getExecutiveInsights(
  context: IntelligenceQueryContext = {},
): Promise<IntelligenceInsight[]> {
  const bundle = await runIntelligencePipeline(
    { ...context, limit: context.limit ?? INTELLIGENCE_SURFACE_LIMIT },
    { warmPipeline: true },
  );
  return bundle.executive;
}
