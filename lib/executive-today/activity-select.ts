/**
 * @deprecated Prefer getExecutiveSignals from @/lib/executive-signals.
 * Kept as a thin re-export for residual imports.
 */

export {
  EXECUTIVE_CONTEXT_ACTIVITY_FETCH as EXECUTIVE_TODAY_ACTIVITY_FETCH,
  selectMeaningfulActivity as selectExecutiveTodayActivity,
} from "@/lib/executive-context/select-activity";
