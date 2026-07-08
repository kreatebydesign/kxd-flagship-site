/**
 * Work Engine extension points — types only (Phase 12E).
 * Future: assign, timer, work item spawn from review workspace.
 */

export interface ReviewWorkspaceOperatorExtensions {
  assigneeId?: number | null;
  timerStartedAt?: string | null;
  linkedWorkItemId?: number | null;
}

export interface ReviewWorkspaceExtensionState {
  version: 1;
  operator?: ReviewWorkspaceOperatorExtensions;
}
