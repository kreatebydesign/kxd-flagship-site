/**
 * Phase 20D — Status transition actions for Work detail.
 * Context-aware; no Kanban.
 */

import type { WorkStatus } from "./types";

export type WorkStatusActionId =
  | "start"
  | "waiting-on-client"
  | "waiting-on-kxd"
  | "review"
  | "complete"
  | "archive";

export type WorkStatusAction = {
  id: WorkStatusActionId;
  label: string;
  status: WorkStatus;
};

const ACTIONS: Record<WorkStatusActionId, WorkStatusAction> = {
  start: { id: "start", label: "Start work", status: "in-progress" },
  "waiting-on-client": {
    id: "waiting-on-client",
    label: "Mark waiting on client",
    status: "waiting-on-client",
  },
  "waiting-on-kxd": {
    id: "waiting-on-kxd",
    label: "Mark waiting on KXD",
    status: "waiting-on-kxd",
  },
  review: { id: "review", label: "Send to review", status: "review" },
  complete: { id: "complete", label: "Complete", status: "completed" },
  archive: { id: "archive", label: "Archive", status: "archived" },
};

const BY_STATUS: Record<WorkStatus, WorkStatusActionId[]> = {
  new: ["start", "waiting-on-client", "waiting-on-kxd", "review", "complete", "archive"],
  planned: ["start", "waiting-on-client", "waiting-on-kxd", "review", "complete", "archive"],
  "in-progress": ["waiting-on-client", "waiting-on-kxd", "review", "complete", "archive"],
  "waiting-on-client": ["start", "waiting-on-kxd", "review", "complete", "archive"],
  "waiting-on-kxd": ["start", "waiting-on-client", "review", "complete", "archive"],
  blocked: ["start", "waiting-on-client", "waiting-on-kxd", "review", "complete", "archive"],
  review: ["start", "complete", "archive"],
  completed: ["archive"],
  archived: [],
};

export function getWorkStatusActions(status: WorkStatus): WorkStatusAction[] {
  return (BY_STATUS[status] ?? []).map((id) => ACTIONS[id]);
}
