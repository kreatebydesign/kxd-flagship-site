/**
 * Phase 26B.1 — Active proposal invariant helpers.
 * One Work item may have only one active scheduling proposal at a time.
 */

import type { ScheduleLinkStatus, WorkScheduleLinkRecord } from "./types";

/** Statuses that count as open / actionable for the one-active invariant. */
export const ACTIVE_SCHEDULE_PROPOSAL_STATUSES: readonly ScheduleLinkStatus[] = [
  "draft",
  "proposed",
  "approval_required",
  "approved",
  "pending_calendar_write",
  "reschedule_required",
  "scheduled",
  "sync_error",
] as const;

/** Terminal / historical — never actionable as the current proposal. */
export const INACTIVE_SCHEDULE_PROPOSAL_STATUSES: readonly ScheduleLinkStatus[] =
  ["rejected", "canceled", "completed", "superseded"] as const;

export const INTEGRITY_SUPERSEDE_REASON =
  "Replaced during active proposal integrity cleanup";

/**
 * Higher = more authoritative when choosing which duplicate to keep.
 * Tie-break with updatedAt / id outside this ranking.
 */
const STATUS_PRECEDENCE: Record<ScheduleLinkStatus, number> = {
  pending_calendar_write: 100,
  approved: 90,
  scheduled: 85,
  sync_error: 80,
  approval_required: 70,
  proposed: 60,
  reschedule_required: 55,
  draft: 40,
  rejected: 0,
  canceled: 0,
  completed: 0,
  superseded: 0,
};

export class ActiveProposalConflictError extends Error {
  readonly code = "ACTIVE_PROPOSAL_EXISTS" as const;

  constructor(
    message: string,
    public readonly existingLinkId: number,
    public readonly workId?: number,
  ) {
    super(message);
    this.name = "ActiveProposalConflictError";
  }
}

export class ConcurrentProposalMutationError extends Error {
  readonly code = "CONCURRENT_PROPOSAL_MUTATION" as const;

  constructor(message: string) {
    super(message);
    this.name = "ConcurrentProposalMutationError";
  }
}

export function isActiveScheduleProposal(input: {
  status: ScheduleLinkStatus;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (INACTIVE_SCHEDULE_PROPOSAL_STATUSES.includes(input.status)) {
    return false;
  }
  if (input.status === "sync_error") {
    // Explicitly non-actionable sync errors do not block a new proposal.
    if (input.metadata?.nonActionable === true) return false;
    return true;
  }
  return ACTIVE_SCHEDULE_PROPOSAL_STATUSES.includes(input.status);
}

export function activeProposalPrecedence(status: ScheduleLinkStatus): number {
  return STATUS_PRECEDENCE[status] ?? 0;
}

export function sameProposedWindow(
  a: { proposedStart: string; proposedEnd: string },
  b: { proposedStart: string; proposedEnd: string },
): boolean {
  return (
    Date.parse(a.proposedStart) === Date.parse(b.proposedStart) &&
    Date.parse(a.proposedEnd) === Date.parse(b.proposedEnd)
  );
}

/**
 * Among active proposals, pick the survivor for cleanup / heal.
 * Precedence: pending write / approved → approval_required → proposed → draft,
 * then newest updatedAt, then highest id.
 */
export function selectAuthoritativeActiveProposal<
  T extends {
    id: number;
    status: ScheduleLinkStatus;
    updatedAt: string;
    metadata?: Record<string, unknown> | null;
  },
>(proposals: T[]): T | null {
  const active = proposals.filter((p) => isActiveScheduleProposal(p));
  if (active.length === 0) return null;
  return [...active].sort((a, b) => {
    const prec =
      activeProposalPrecedence(b.status) - activeProposalPrecedence(a.status);
    if (prec !== 0) return prec;
    const t = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (t !== 0) return t;
    return b.id - a.id;
  })[0];
}

export function assertSingleActiveProposal(
  proposals: Array<{
    id: number;
    status: ScheduleLinkStatus;
    metadata?: Record<string, unknown> | null;
  }>,
  workId?: number,
): void {
  const active = proposals.filter((p) => isActiveScheduleProposal(p));
  if (active.length <= 1) return;
  const ids = active.map((p) => p.id).join(", ");
  throw new ActiveProposalConflictError(
    `Work${workId != null ? ` ${workId}` : ""} has ${active.length} active scheduling proposals (${ids}). Run integrity repair.`,
    active[0].id,
    workId,
  );
}

export function activeProposalConflictMessage(existingLinkId: number): string {
  return `An active scheduling proposal already exists (link #${existingLinkId}) with a different window. Review or adjust the existing proposal in Scheduling.`;
}

/** Projection helper: Work schedulingStatus for an active link status. */
export function workProjectionStatusForLink(
  status: ScheduleLinkStatus,
): "none" | "proposed" | "approved" | "pending_calendar_write" | "scheduled" | "conflict" | "sync_error" {
  switch (status) {
    case "scheduled":
      return "scheduled";
    case "pending_calendar_write":
      return "pending_calendar_write";
    case "approved":
      return "approved";
    case "sync_error":
      return "sync_error";
    case "draft":
    case "proposed":
    case "approval_required":
    case "reschedule_required":
      return "proposed";
    default:
      return "none";
  }
}

export type { WorkScheduleLinkRecord };
