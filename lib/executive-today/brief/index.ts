/**
 * Phase 27B — Executive Today calendar intelligence brief.
 */

export type {
  CapacityConfidence,
  CommitmentCorrelation,
  CommitmentRiskLevel,
  DayFlowItemKind,
  DayFlowItemState,
  ExecutiveDayBounds,
  ExecutiveDayOrientation,
  ExecutiveTodayAttentionItem,
  ExecutiveTodayBrief,
  ExecutiveTodayCapacity,
  ExecutiveTodayClosing,
  ExecutiveTodayComposeInput,
  ExecutiveTodayCurrentPosition,
  ExecutiveTodayDayFlowItem,
  ExecutiveTodayFreshness,
  ExecutiveTodayLinkedSchedule,
  ExecutiveTodayRecommendation,
  ExecutiveTodayWorkRef,
} from "./types";

export { composeExecutiveTodayBrief } from "./compose";
export { correlateDayCommitments } from "./correlate";
export { buildExecutiveTodayBrief } from "./load-brief";
export {
  buildExecutiveDayBounds,
  formatClock,
  largestGap,
  minutesBetween,
  normalizeObservedInterval,
  overlaps,
  subtractBusy,
  totalMinutes,
} from "./time-model";
