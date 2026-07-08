import { summarizeBusinessContext } from "@/lib/business-context";
import type {
  BusinessComparison,
  BusinessEvolution,
  BusinessMemoryInput,
  BusinessMemorySummary,
  BusinessMilestone,
  BusinessTrend,
} from "./types";
import { historySpanDays, resolveHistoryRange } from "./utils";

/**
 * Synthesize a calm business memory summary.
 */
export function buildBusinessMemorySummary(
  input: BusinessMemoryInput,
  milestones: BusinessMilestone[],
  trends: BusinessTrend[],
  evolution: BusinessEvolution[],
  comparisons: BusinessComparison[],
): BusinessMemorySummary {
  const range = resolveHistoryRange(input.observations);
  const spanDays = historySpanDays(range);

  const dominantEvolutions = evolution.slice(0, 3).map((e) => e.label);
  const improvingTrends = trends.filter((t) => t.direction === "improving").length;
  const emergingTrends = trends.filter((t) => t.direction === "emerging").length;
  const repeatedMilestones = milestones.filter((m) => m.source === "observation").length;

  let headline: string;
  let narrative: string;

  if (input.observations.length === 0) {
    headline = "Business memory is forming.";
    narrative =
      "Observation history is still building. Memory will deepen as the Observer records more runs.";
  } else if (evolution.length > 0) {
    headline = "The business has evolved across recorded history.";
    narrative = `${dominantEvolutions.join(", ")} ${dominantEvolutions.length === 1 ? "is" : "are"} visible across ${input.historyRunCount} observation runs spanning ${spanDays} day${spanDays === 1 ? "" : "s"}.`;
  } else if (trends.some((t) => t.direction === "stable")) {
    headline = "Business patterns are stabilizing.";
    narrative = `Observation history shows steady patterns across ${input.observations.length} records. ${summarizeBusinessContext(input.context)}`;
  } else {
    headline = "Business memory is accumulating.";
    narrative = `${input.observations.length} observations across ${input.historyRunCount} runs inform the current understanding. ${repeatedMilestones > 0 ? `${repeatedMilestones} repeated milestones are recorded.` : ""}`;
  }

  if (improvingTrends > 0) {
    narrative += ` ${improvingTrends} improving trend${improvingTrends === 1 ? "" : "s"} visible.`;
  }
  if (emergingTrends > 0) {
    narrative += ` ${emergingTrends} emerging pattern${emergingTrends === 1 ? "" : "s"} noted.`;
  }
  if (comparisons.some((c) => c.shift === "increased")) {
    narrative += " Some domains show increased activity over the history span.";
  }

  narrative += " This memory describes change — not prescribed actions.";

  return {
    headline,
    narrative: narrative.trim(),
    dominantEvolutions,
    observationRunCount: input.historyRunCount,
    historySpanDays: spanDays,
  };
}
