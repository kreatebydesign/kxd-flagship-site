/**
 * Phase 26B / 26B.1 — Scheduling Proposal Workspace types & grouping (client-safe).
 */

import { isActiveScheduleProposal } from "./active-proposal";
import type {
  ScheduleLinkStatus,
  SchedulingCapability,
  SchedulingConfidence,
  SchedulingPolicyEvidence,
  WorkScheduleLinkRecord,
} from "./types";

export type SchedulingWorkspaceGroupId =
  | "awaiting-approval"
  | "approved"
  | "pending-calendar-write"
  | "scheduled"
  | "rejected"
  | "cancelled"
  | "completed";

export const SCHEDULING_WORKSPACE_GROUPS: SchedulingWorkspaceGroupId[] = [
  "awaiting-approval",
  "approved",
  "pending-calendar-write",
  "scheduled",
  "rejected",
  "cancelled",
  "completed",
];

export const SCHEDULING_WORKSPACE_GROUP_LABELS: Record<
  SchedulingWorkspaceGroupId,
  string
> = {
  "awaiting-approval": "Awaiting Approval",
  approved: "Approved",
  "pending-calendar-write": "Pending Calendar Write",
  scheduled: "Scheduled",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function workspaceGroupForStatus(
  status: ScheduleLinkStatus,
): SchedulingWorkspaceGroupId | null {
  switch (status) {
    case "draft":
    case "proposed":
    case "approval_required":
    case "reschedule_required":
      return "awaiting-approval";
    case "approved":
      return "approved";
    case "pending_calendar_write":
      return "pending-calendar-write";
    case "scheduled":
    case "sync_error":
      return "scheduled";
    case "rejected":
      return "rejected";
    case "canceled":
      return "cancelled";
    case "completed":
      return "completed";
    case "superseded":
      // Historical only — excluded from workspace active groups
      return null;
    default:
      return null;
  }
}

export function humanScheduleLinkStatus(status: ScheduleLinkStatus): string {
  switch (status) {
    case "approval_required":
      return "Awaiting approval";
    case "proposed":
      return "Proposed";
    case "approved":
      return "Approved";
    case "pending_calendar_write":
      return "Pending calendar write";
    case "scheduled":
      return "Scheduled";
    case "rejected":
      return "Rejected";
    case "canceled":
      return "Cancelled";
    case "completed":
      return "Completed";
    case "reschedule_required":
      return "Reschedule required";
    case "sync_error":
      return "Sync error";
    case "draft":
      return "Draft";
    case "superseded":
      return "Superseded";
    default:
      return status;
  }
}

/** Phase 27A — calm sync health labels (not lifecycle status). */
export function humanSyncHealth(input: {
  syncStatus: string;
  recoveryState?: string | null;
  externalChangeClass?: string | null;
}): string {
  if (input.recoveryState === "cancelled_remote") {
    return "Cancelled in Google Calendar";
  }
  if (input.recoveryState === "missing_remote") {
    return "Missing in Google Calendar";
  }
  if (input.recoveryState === "review_required") {
    if (input.externalChangeClass === "schedule_impacting") {
      return "External schedule change";
    }
    if (input.externalChangeClass === "descriptive") {
      return "External descriptive change";
    }
    return "Review recommended";
  }
  if (input.recoveryState === "restored") {
    return "Restored";
  }
  switch (input.syncStatus) {
    case "synced":
      return "Synchronized";
    case "stale":
      return "External change detected";
    case "deleted_remotely":
      return "Not confirmed in Google Calendar";
    case "error":
      return "Synchronization failed";
    case "pending_write":
      return "Pending calendar write";
    default:
      return "Not synchronized";
  }
}

export function calendarRecoveryGuidance(input: {
  recoveryState?: string | null;
  syncStatus?: string | null;
}): string | null {
  if (input.recoveryState === "cancelled_remote") {
    return "The Work item still exists. The Google Calendar event was cancelled externally. KXD OS did not recreate it. You may retry synchronization; later phases will support explicit rescheduling.";
  }
  if (input.recoveryState === "missing_remote") {
    return "The Work item still exists. The Google Calendar event could not be confirmed. KXD OS did not recreate it. You may retry synchronization; later phases will support explicit replacement.";
  }
  if (input.syncStatus === "error") {
    return "Synchronization could not reach Google Calendar. Stored event linkage was preserved. Retry when the connection is available.";
  }
  return null;
}

/** Occupancy-safe proposal card for the workspace list. */
export interface SchedulingProposalCard {
  link: WorkScheduleLinkRecord;
  workTitle: string;
  workHref: string;
  clientName: string;
  project: string | null;
  estimatedEffortHours: number | null;
  requestedByLabel: string | null;
  policy: SchedulingPolicyEvidence | null;
  group: SchedulingWorkspaceGroupId;
}

export interface SchedulingProposalAuditEntry {
  at: string;
  actor: string | null;
  action: string;
  detail: string | null;
}

export interface SchedulingProposalDetail extends SchedulingProposalCard {
  workSummary: string | null;
  workDescription: string | null;
  workPriority: string | null;
  workStatus: string | null;
  auditHistory: SchedulingProposalAuditEntry[];
}

export interface SchedulingWorkspaceCapabilities {
  canSuggest: boolean;
  canApprove: boolean;
  canAdjust: boolean;
  canCancelAny: boolean;
  capabilities: SchedulingCapability[];
}

export function buildWorkspaceCapabilities(
  caps: ReadonlySet<SchedulingCapability>,
): SchedulingWorkspaceCapabilities {
  return {
    canSuggest: caps.has("scheduling.suggest"),
    canApprove: caps.has("scheduling.approve"),
    canAdjust: caps.has("scheduling.suggest"),
    canCancelAny: caps.has("scheduling.approve"),
    capabilities: [...caps],
  };
}

export function canActorCancelProposal(input: {
  canApprove: boolean;
  actorUserId: number | null;
  requestedById: number | null;
}): boolean {
  if (input.canApprove) return true;
  if (input.actorUserId == null || input.requestedById == null) return false;
  return input.actorUserId === input.requestedById;
}

export function canActorAdjustProposal(input: {
  canApprove: boolean;
  canSuggest: boolean;
  actorUserId: number | null;
  requestedById: number | null;
  status: ScheduleLinkStatus;
}): boolean {
  if (!input.canSuggest && !input.canApprove) return false;
  const adjustable =
    input.status === "draft" ||
    input.status === "proposed" ||
    input.status === "approval_required" ||
    input.status === "rejected";
  if (!adjustable) return false;
  if (input.canApprove) return true;
  if (input.actorUserId == null || input.requestedById == null) return false;
  return input.actorUserId === input.requestedById;
}

export function confidenceLabel(c: SchedulingConfidence): string {
  if (c === "high") return "High";
  if (c === "medium") return "Medium";
  return "Low";
}

/**
 * One active card per Work for actionable groups.
 * Historical rejected/cancelled/completed may still list multiple.
 */
export function dedupeActiveProposalsPerWork(
  cards: SchedulingProposalCard[],
): SchedulingProposalCard[] {
  const activeByWork = new Map<number, SchedulingProposalCard>();
  const historical: SchedulingProposalCard[] = [];

  for (const card of cards) {
    if (!isActiveScheduleProposal(card.link)) {
      historical.push(card);
      continue;
    }
    const workId = card.link.workId;
    const existing = activeByWork.get(workId);
    if (!existing) {
      activeByWork.set(workId, card);
      continue;
    }
    // Prefer higher-precedence / newer (list is usually -updatedAt)
    const existingPrec = groupPriority(existing.link.status);
    const nextPrec = groupPriority(card.link.status);
    if (
      nextPrec > existingPrec ||
      (nextPrec === existingPrec &&
        Date.parse(card.link.updatedAt) >= Date.parse(existing.link.updatedAt))
    ) {
      activeByWork.set(workId, card);
    }
  }

  return [...activeByWork.values(), ...historical];
}

function groupPriority(status: ScheduleLinkStatus): number {
  switch (status) {
    case "pending_calendar_write":
      return 100;
    case "approved":
      return 90;
    case "scheduled":
      return 85;
    case "approval_required":
      return 70;
    case "proposed":
      return 60;
    case "reschedule_required":
      return 55;
    case "draft":
      return 40;
    default:
      return 0;
  }
}

export function groupProposals(
  cards: SchedulingProposalCard[],
): Record<SchedulingWorkspaceGroupId, SchedulingProposalCard[]> {
  const groups: Record<SchedulingWorkspaceGroupId, SchedulingProposalCard[]> = {
    "awaiting-approval": [],
    approved: [],
    "pending-calendar-write": [],
    scheduled: [],
    rejected: [],
    cancelled: [],
    completed: [],
  };
  for (const card of dedupeActiveProposalsPerWork(cards)) {
    groups[card.group].push(card);
  }
  return groups;
}
