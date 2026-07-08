/**
 * Phase 18B — Business Memory & Evolution Foundation
 *
 * Accumulated operational understanding from trusted history.
 * Never invents history, renders UI, automates, or queries business systems directly.
 *
 * Architecture:
 *   Observation History + Brain + Pulse + Context → Business Memory → Future Rituals / Automation
 */

export type {
  BusinessMemoryResult,
  BusinessMemoryInput,
  BusinessMemorySummary,
  BusinessMemoryHistoryRange,
  BusinessMemoryTimeline,
  BusinessMilestone,
  BusinessMilestoneSource,
  BusinessTrend,
  BusinessTrendDirection,
  BusinessEvolution,
  BusinessComparison,
  BusinessComparisonShift,
  PulseSnapshot,
} from "./types";

export { buildBusinessMemoryTimeline } from "./timeline";
export { buildBusinessMilestones } from "./milestones";
export { buildBusinessTrends } from "./trends";
export { buildBusinessEvolution } from "./evolution";
export { buildBusinessComparisons } from "./comparisons";
export { buildBusinessMemorySummary } from "./summary";

export {
  runBusinessMemory,
  buildBusinessMemory,
  getLatestBusinessMemoryResult,
  getPulseSnapshots,
} from "./run";
