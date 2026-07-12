/**
 * Phase 24A — Work Planning & Daily Execution
 *
 * Planning field: plannedForDate (independent of dueDate).
 * Query: getWorkView(view, filters, sort)
 */

export type {
  GetWorkViewInput,
  WorkDueRange,
  WorkFilterOption,
  WorkFilterOptions,
  WorkSortId,
  WorkTodayGroup,
  WorkTodayGroupId,
  WorkViewContextHints,
  WorkViewFilters,
  WorkViewId,
  WorkViewResult,
} from "./types";

export {
  WORK_DUE_RANGE_LABELS,
  WORK_SORT_LABELS,
  WORK_VIEW_EMPTY,
  WORK_VIEW_IDS,
  WORK_VIEW_LABELS,
} from "./types";

export {
  addLocalDays,
  dateKeyEquals,
  isSameLocalDay,
  parseDateKey,
  toLocalDateKey,
} from "./dates";

export {
  applyWorkFilters,
  belongsInTodaySet,
  composeWorkView,
  countWorkViews,
  groupTodayWork,
  isElevatedWork,
  isPlannedOn,
  parseWorkSortId,
  parseWorkViewId,
  selectWorkViewItems,
  sortWorkViewItems,
  workViewHref,
} from "./query";

export {
  getTodayPlan,
  getUpcomingPlan,
  planWorkForDate,
  planWorkForToday,
  planWorkForTomorrow,
  removeWorkFromPlan,
} from "./plan";

export { getWorkFilterOptions } from "./options";

export {
  getWorkView,
  loadWorkPlanningPage,
  loadWorkViewContextHints,
} from "./load";
export type { WorkPlanningPageData } from "./load";
