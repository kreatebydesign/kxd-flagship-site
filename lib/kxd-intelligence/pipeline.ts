import "server-only";

/**
 * Phase 21B — permanent reasoning pipeline entry.
 */

import { reasonFromSources } from "./reason";
import { loadIntelligenceSources } from "./sources";
import type {
  IntelligenceBundle,
  IntelligenceQueryContext,
} from "./types";

export async function runIntelligencePipeline(
  context: IntelligenceQueryContext = {},
  options?: { warmPipeline?: boolean },
): Promise<IntelligenceBundle> {
  const sources = await loadIntelligenceSources({
    warmPipeline: options?.warmPipeline ?? false,
  });
  return reasonFromSources(sources, context);
}
