/**
 * Persist guided-work checklist on Work.metadata (JSON) — no migration required.
 */

import type { StaffGuidedChecklistId } from "./guided-checklist";

export const STAFF_GUIDED_EXECUTION_METADATA_KEY = "staffGuidedExecution";

export interface StaffGuidedExecutionState {
  v: 1;
  assigneeUserId: number;
  checked: Partial<Record<StaffGuidedChecklistId, boolean>>;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function readRawWorkMetadata(doc: AnyDoc): Record<string, unknown> {
  const raw = doc.metadata;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

export function readStaffGuidedExecution(
  doc: AnyDoc,
  assigneeUserId: number,
): StaffGuidedExecutionState | null {
  const meta = readRawWorkMetadata(doc);
  const block = meta[STAFF_GUIDED_EXECUTION_METADATA_KEY];
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const state = block as StaffGuidedExecutionState;
  if (state.v !== 1 || state.assigneeUserId !== assigneeUserId) return null;
  if (!state.checked || typeof state.checked !== "object") return null;
  return state;
}

export function buildStaffGuidedExecutionPatch(
  existingMetadata: Record<string, unknown>,
  assigneeUserId: number,
  checked: Partial<Record<StaffGuidedChecklistId, boolean>>,
): Record<string, unknown> {
  const nextState: StaffGuidedExecutionState = {
    v: 1,
    assigneeUserId,
    checked,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...existingMetadata,
    [STAFF_GUIDED_EXECUTION_METADATA_KEY]: nextState,
  };
}

export function checklistStatesEqual(
  a: Partial<Record<StaffGuidedChecklistId, boolean>>,
  b: Partial<Record<StaffGuidedChecklistId, boolean>>,
  ids: readonly StaffGuidedChecklistId[],
): boolean {
  return ids.every((id) => Boolean(a[id]) === Boolean(b[id]));
}
