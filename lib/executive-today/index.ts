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
  ExecutiveTodayPrimary,
  ExecutiveTodayUpcomingItem,
} from "./types";

export {
  mapActivityToTodayItem,
  mapRecommendationFallback,
  mapWorkToFocusItem,
} from "./types";

export { loadExecutiveToday } from "./load";
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
