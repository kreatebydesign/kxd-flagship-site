/**
 * Phase 23A — Executive Context Engine
 *
 * Shared awareness layer for KXD OS.
 * Composes existing services. Does not reason, generate prose, or render UI.
 *
 * Reasoning stays in KXD Intelligence.
 * Presentation stays in workspaces (e.g. Executive Today).
 * Signal quality for attention surfaces comes from Executive Signal Engine (23B).
 */

export type {
  ExecutiveAttentionSlice,
  ExecutiveContext,
  ExecutiveContextInput,
  ExecutiveContextItemKind,
  ExecutiveContextRef,
  ExecutiveContinuationSlice,
  ExecutiveExtensionSlot,
  ExecutiveFocusSlice,
  ExecutiveHistorySlice,
  ExecutiveMomentumSlice,
  ExecutiveSummarySlice,
  ExecutiveTrainingStatus,
  ExecutiveWaitingSlice,
} from "./types";

export { EXECUTIVE_CONTEXT_EXTENSIONS } from "./extensions";
export {
  EXECUTIVE_CONTEXT_ACTIVITY_FETCH,
  selectMeaningfulActivity,
} from "./select-activity";
export { composeExecutiveContext } from "./compose";
export {
  getExecutiveAttention,
  getExecutiveContext,
  getExecutiveContinuation,
  getExecutiveFocus,
  getExecutiveHistory,
  getExecutiveMomentum,
  getExecutiveSummary,
  getExecutiveWaiting,
} from "./getters";
