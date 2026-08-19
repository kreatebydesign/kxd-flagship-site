/**
 * Phase 22A / 27B — Executive Today engine
 * Phase 7 — Today is the sole founder home (product identity).
 * Engineering module name retained; user-facing product is Today.
 */

import { FOUNDER_HOME_PATH } from "@/lib/admin/home-policy";

export type {
  ExecutiveTodayActivityItem,
  ExecutiveTodayData,
  ExecutiveTodayFocusItem,
  ExecutiveTodayIntelligenceBlock,
  ExecutiveTodayOpportunities,
  ExecutiveTodayPrimary,
  ExecutiveTodayUpcomingItem,
  TodayCommercialItem,
  TodayCommercialKind,
} from "./types";

export {
  mapActivityToTodayItem,
  mapRecommendationFallback,
  mapWorkToFocusItem,
} from "./types";

export { loadExecutiveToday } from "./load";
export {
  TODAY_EMPTY,
  TODAY_EXCEPTIONS_LIMIT,
  TODAY_EVIDENCE_LIMIT,
  TODAY_PRIORITIES_LIMIT,
  TODAY_QUIET_EXITS,
  TODAY_SCHEDULE_LIMIT,
  TODAY_SIGNALS_LIMIT,
  selectTodaySchedule,
} from "./presentation";
export {
  composeDaySentence,
  composeFlowPeriods,
  composeMomentumLine,
  composePostureLine,
  composeWaitingForYou,
  humanizePrimary,
  recomposeTodayExperience,
  selectDecisionSignals,
} from "./recomposition";
export type {
  TodayDayPeriod,
  TodayFlowPeriod,
  TodayRecomposition,
  TodayWaitingItem,
} from "./recomposition";
export {
  EXECUTIVE_TODAY_ACTIVITY_FETCH,
  selectExecutiveTodayActivity,
} from "./activity-select";

export {
  buildExecutiveTodayBrief,
  composeExecutiveTodayBrief,
  correlateDayCommitments,
  buildExecutiveDayBounds,
} from "./brief";
export type { ExecutiveTodayBrief } from "./brief";

/** @deprecated Prefer FOUNDER_HOME_PATH — retained for compatibility */
export const EXECUTIVE_TODAY_HOME = FOUNDER_HOME_PATH;
