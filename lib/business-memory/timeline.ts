import type { Observation } from "@/lib/observer/types";
import type { BusinessMemoryInput, BusinessMemoryTimeline } from "./types";
import { countBySource, resolveHistoryRange } from "./utils";

/**
 * Build timeline metadata from observation history.
 */
export function buildBusinessMemoryTimeline(input: BusinessMemoryInput): BusinessMemoryTimeline {
  const range = resolveHistoryRange(input.observations);

  return {
    range,
    observationCount: input.observations.length,
    runCount: input.historyRunCount,
    sourceCounts: countBySource(input.observations),
  };
}
