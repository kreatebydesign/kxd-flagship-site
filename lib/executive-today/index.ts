/**
 * Phase 22A — Executive Today
 * Permanent KXD OS home composition.
 */

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

export const EXECUTIVE_TODAY_HOME = "/admin/operations/today" as const;
