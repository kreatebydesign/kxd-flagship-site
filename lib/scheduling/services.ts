/**
 * Phase 25B / 26B.1 — Scheduling domain services.
 * Canonical mutation surface for proposals, approvals, and Work projections.
 * No Google Calendar reads or writes.
 *
 * Invariant: one Work item → one active scheduling proposal.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import { processOperationalFlow } from "@/lib/operational-flow";
import type { OperationalTransitionKind } from "@/lib/operational-flow/types";
import { WORK_COLLECTION } from "@/lib/work/constants";
import {
  ACTIVE_SCHEDULE_PROPOSAL_STATUSES,
  ActiveProposalConflictError,
  ConcurrentProposalMutationError,
  activeProposalConflictMessage,
  isActiveScheduleProposal,
  sameProposedWindow,
  selectAuthoritativeActiveProposal,
  workProjectionStatusForLink,
} from "./active-proposal";
import { recordSchedulingAudit } from "./audit";
import {
  assertScheduleStatusTransition,
  canConfirmScheduledFromPendingWrite,
  nextApprovalStatusForLifecycle,
  syncStatusAfterApproval,
} from "./lifecycle";
import { assertCapability, actorHasCapability } from "./permissions";
import { evaluateSchedulingPolicy } from "./policy";
import {
  applyWorkScheduleProjection,
  clearWorkScheduleProjection,
  projectionForPendingCalendarWrite,
  projectionForProposed,
  projectionForScheduled,
  projectionForLinkStatus,
} from "./projections";
import type {
  CreateScheduleProposalInput,
  ScheduleLinkStatus,
  SchedulingActor,
  SchedulingPolicyEvidence,
  SchedulingWorkContext,
  UpdateScheduleProposalInput,
  WorkScheduleLinkRecord,
} from "./types";
import { SCHEDULE_LINK_COLLECTION } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readTags(doc: AnyDoc): string[] {
  if (!Array.isArray(doc.tags)) return [];
  return doc.tags
    .map((row: AnyDoc) => (row?.tag != null ? String(row.tag) : ""))
    .filter(Boolean);
}

function mapLink(doc: AnyDoc): WorkScheduleLinkRecord {
  return {
    id: doc.id as number,
    workId: relId(doc.work) ?? 0,
    calendarOwnerId: relId(doc.calendarOwner),
    requestedById: relId(doc.requestedBy),
    approvedById: relId(doc.approvedBy),
    status: doc.status as ScheduleLinkStatus,
    approvalStatus: doc.approvalStatus,
    syncStatus: doc.syncStatus,
    schedulingMode: doc.schedulingMode,
    permissionLevel: Number(doc.permissionLevel) as 1 | 2 | 3,
    proposedStart: String(doc.proposedStart),
    proposedEnd: String(doc.proposedEnd),
    timezone: String(doc.timezone ?? KXD_BUSINESS_TIMEZONE),
    durationMinutes: Number(doc.durationMinutes),
    schedulingReason: doc.schedulingReason ? String(doc.schedulingReason) : null,
    evidenceSummary: doc.evidenceSummary ? String(doc.evidenceSummary) : null,
    confidence: doc.confidence ?? "medium",
    source: doc.source ?? "operator",
    restrictionReason: doc.restrictionReason
      ? String(doc.restrictionReason)
      : null,
    rejectionReason: doc.rejectionReason ? String(doc.rejectionReason) : null,
    canceledReason: doc.canceledReason ? String(doc.canceledReason) : null,
    supersededReason: doc.supersededReason
      ? String(doc.supersededReason)
      : null,
    replacedById: relId(doc.replacedBy),
    googleCalendarId: doc.googleCalendarId ? String(doc.googleCalendarId) : null,
    googleEventId: doc.googleEventId ? String(doc.googleEventId) : null,
    googleEventEtag: doc.googleEventEtag ? String(doc.googleEventEtag) : null,
    googleEventUpdatedAt: doc.googleEventUpdatedAt
      ? String(doc.googleEventUpdatedAt)
      : null,
    googleEventHtmlLink: doc.googleEventHtmlLink
      ? String(doc.googleEventHtmlLink)
      : null,
    policySnapshot: (doc.policySnapshot as SchedulingPolicyEvidence) ?? null,
    conflictSnapshot: (doc.conflictSnapshot as Record<string, unknown>) ?? null,
    displacedItemSnapshot:
      (doc.displacedItemSnapshot as Record<string, unknown>) ?? null,
    metadata: (doc.metadata as Record<string, unknown>) ?? null,
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
  };
}

async function loadWorkContext(workId: number): Promise<{
  work: SchedulingWorkContext;
  clientId: number | null;
  raw: AnyDoc;
}> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (!doc) {
    throw new Error(`Work ${workId} not found.`);
  }

  const clientId = relId(doc.client);
  return {
    clientId,
    raw: doc,
    work: {
      workId,
      title: String(doc.title ?? "Work"),
      priority: String(doc.priority ?? "normal"),
      category: String(doc.category ?? "general"),
      clientId,
      estimatedEffortHours:
        typeof doc.estimatedEffort === "number" ? doc.estimatedEffort : null,
      tags: readTags(doc),
      metadata:
        doc.metadata && typeof doc.metadata === "object"
          ? (doc.metadata as Record<string, unknown>)
          : null,
    },
  };
}

async function loadLink(linkId: number): Promise<WorkScheduleLinkRecord> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    id: linkId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  if (!doc) throw new Error(`Schedule link ${linkId} not found.`);
  return mapLink(doc);
}

async function updateLinkStatus(
  linkId: number,
  data: Record<string, unknown>,
): Promise<WorkScheduleLinkRecord> {
  const payload = await getPayload({ config });
  const doc = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    id: linkId,
    data,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  return mapLink(doc);
}

function evidenceSummaryText(evidence: SchedulingPolicyEvidence): string {
  const parts = [
    `decision=${evidence.decision}`,
    `level=${evidence.permissionLevel}`,
    `mode=${evidence.schedulingMode}`,
    evidence.reasons.slice(0, 3).join("; "),
  ];
  if (evidence.warnings.length) {
    parts.push(`warnings: ${evidence.warnings.slice(0, 2).join("; ")}`);
  }
  parts.push(evidence.calendarAvailabilityNote);
  return parts.filter(Boolean).join(" — ");
}

function durationFromRange(start: string, end: string): number {
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
}

function isUniqueViolation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /unique/i.test(msg) ||
    /duplicate key/i.test(msg) ||
    /work_schedule_links_one_active/i.test(msg)
  );
}

async function emitFlow(
  kind: OperationalTransitionKind,
  workId: number,
  clientId: number | null,
  actor: SchedulingActor,
  previousStatus?: string | null,
  nextStatus?: string | null,
): Promise<void> {
  try {
    await processOperationalFlow({
      kind,
      source: "calendar",
      entityId: workId,
      workId,
      clientId,
      actorEmail: actor.email,
      previousStatus: previousStatus ?? null,
      nextStatus: nextStatus ?? null,
    });
  } catch (err) {
    console.warn(
      "[KXD Scheduling] Operational Flow emit skipped:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Load all active proposals for a Work item (may be >1 before repair).
 */
export async function findActiveProposalsForWork(
  workId: number,
): Promise<WorkScheduleLinkRecord[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    where: {
      and: [
        { work: { equals: workId } },
        { status: { in: [...ACTIVE_SCHEDULE_PROPOSAL_STATUSES] } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });
  return (result.docs as AnyDoc[])
    .map(mapLink)
    .filter((link) => isActiveScheduleProposal(link));
}

export async function findActiveProposalForWork(
  workId: number,
): Promise<WorkScheduleLinkRecord | null> {
  const actives = await findActiveProposalsForWork(workId);
  return selectAuthoritativeActiveProposal(actives);
}

export async function assertSingleActiveProposalForWork(
  workId: number,
): Promise<WorkScheduleLinkRecord | null> {
  const actives = await findActiveProposalsForWork(workId);
  if (actives.length > 1) {
    const ids = actives.map((p) => p.id).join(", ");
    throw new ActiveProposalConflictError(
      `Work ${workId} has ${actives.length} active scheduling proposals (${ids}). Review or adjust in Scheduling, or run integrity repair.`,
      actives[0].id,
      workId,
    );
  }
  return actives[0] ?? null;
}

async function healWorkProjection(
  workId: number,
  link: WorkScheduleLinkRecord,
  actor: SchedulingActor,
  clientId: number | null,
  detail: string,
): Promise<void> {
  const projStatus = workProjectionStatusForLink(link.status);
  await applyWorkScheduleProjection(
    workId,
    projectionForLinkStatus(
      projStatus,
      link.id,
      link.proposedStart,
      link.proposedEnd,
    ),
  );
  await recordSchedulingAudit({
    workId,
    linkId: link.id,
    clientId,
    action: "projection_healed",
    detail,
    actor,
  });
}

/**
 * Mark a proposal superseded. Preserves history. Soft-fails secondary audit.
 */
export async function supersedeScheduleProposal(
  linkId: number,
  actor: SchedulingActor,
  reason: string,
  replacedById?: number | null,
): Promise<WorkScheduleLinkRecord> {
  const existing = await loadLink(linkId);
  if (!isActiveScheduleProposal(existing) && existing.status !== "draft") {
    return existing;
  }
  if (existing.status === "superseded") return existing;

  assertScheduleStatusTransition(existing.status, "superseded");
  const link = await updateLinkStatus(linkId, {
    status: "superseded",
    supersededReason: reason,
    replacedBy: replacedById ?? undefined,
  });

  const { clientId, raw } = await loadWorkContext(existing.workId);
  const activeId = relId(raw.activeScheduleLink);
  if (activeId === linkId) {
    // Projection will be repaired by caller to the survivor when available.
  }

  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "proposal_superseded",
    detail: reason,
    actor,
    metadata: { replacedById: replacedById ?? null },
  });

  return link;
}

/**
 * Public policy evaluation — no persistence.
 */
export function evaluateSchedulingPolicyForInput(
  input: Parameters<typeof evaluateSchedulingPolicy>[0],
): SchedulingPolicyEvidence {
  return evaluateSchedulingPolicy(input);
}

export async function createScheduleProposal(
  input: CreateScheduleProposalInput,
): Promise<{
  link: WorkScheduleLinkRecord;
  policy: SchedulingPolicyEvidence;
  reused?: boolean;
}> {
  assertCapability(input.actor, "scheduling.suggest");

  const { work, clientId, raw } = await loadWorkContext(input.workId);
  const timezone = input.timezone?.trim() || KXD_BUSINESS_TIMEZONE;
  const proposedStart = input.proposedStart;
  const proposedEnd = input.proposedEnd;
  const durationMinutes =
    input.durationMinutes && input.durationMinutes > 0
      ? input.durationMinutes
      : durationFromRange(proposedStart, proposedEnd);

  const payload = await getPayload({ config });

  // Cancel abandoned drafts left by prior failed attempts (never reached approval).
  const abandonedDrafts = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    where: {
      and: [
        { work: { equals: input.workId } },
        { status: { equals: "draft" } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  for (const doc of abandonedDrafts.docs as AnyDoc[]) {
    try {
      assertScheduleStatusTransition("draft", "canceled");
      await updateLinkStatus(doc.id as number, {
        status: "canceled",
        canceledReason: "Superseded — abandoned draft from incomplete proposal.",
      });
    } catch {
      // ignore cleanup failures
    }
  }

  // One-active enforcement — load ALL actives, not limit 1.
  const actives = await findActiveProposalsForWork(input.workId);
  if (actives.length > 0) {
    const authoritative = selectAuthoritativeActiveProposal(actives)!;
    const sameWindow = sameProposedWindow(authoritative, {
      proposedStart,
      proposedEnd,
    });

    if (sameWindow) {
      await healWorkProjection(
        input.workId,
        authoritative,
        input.actor,
        clientId,
        "Healed Work projection to existing same-window proposal.",
      );
      await recordSchedulingAudit({
        workId: input.workId,
        linkId: authoritative.id,
        clientId,
        action: "proposal_reused",
        detail: "Returned existing active proposal (same window; idempotent).",
        actor: input.actor,
      });
      return {
        link: authoritative,
        policy:
          (authoritative.policySnapshot as SchedulingPolicyEvidence) ??
          evaluateSchedulingPolicy({
            actor: input.actor,
            work,
            slot: {
              proposedStart: authoritative.proposedStart,
              proposedEnd: authoritative.proposedEnd,
              timezone: authoritative.timezone,
              durationMinutes: authoritative.durationMinutes,
            },
            intent: input.intent ?? "suggest",
          }),
        reused: true,
      };
    }

    // Different window — never create a second active record.
    throw new ActiveProposalConflictError(
      activeProposalConflictMessage(authoritative.id),
      authoritative.id,
      input.workId,
    );
  }

  // Heal stale projection pointing at nothing / inactive
  const existingStatus = String(raw.schedulingStatus ?? "none");
  if (existingStatus !== "none" && actives.length === 0) {
    await clearWorkScheduleProjection(input.workId);
  }

  const policy = evaluateSchedulingPolicy({
    actor: input.actor,
    work,
    slot: { proposedStart, proposedEnd, timezone, durationMinutes },
    intent: input.intent ?? "suggest",
    externalAttendees: input.externalAttendees,
    displacesProtectedTime: input.displacesProtectedTime,
    highImpactChange: input.highImpactChange,
  });

  if (!policy.policyValid || policy.decision === "block") {
    await recordSchedulingAudit({
      workId: input.workId,
      clientId,
      action: "policy_blocked",
      detail: policy.blockingReasons.join("; ") || "Policy blocked proposal.",
      actor: input.actor,
      metadata: { policy },
    });
    throw new Error(
      policy.blockingReasons.join(" ") || "Scheduling policy blocked this proposal.",
    );
  }

  let created: AnyDoc;
  try {
    created = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: SCHEDULE_LINK_COLLECTION as any,
      data: {
        work: input.workId,
        calendarOwner: input.calendarOwnerId ?? undefined,
        requestedBy: input.actor.userId ?? undefined,
        status: "draft",
        approvalStatus: "none",
        syncStatus: "none",
        schedulingMode: policy.schedulingMode,
        permissionLevel: String(policy.permissionLevel),
        proposedStart,
        proposedEnd,
        timezone,
        durationMinutes,
        schedulingReason: input.schedulingReason ?? undefined,
        evidenceSummary: evidenceSummaryText(policy),
        confidence: policy.confidence,
        source: "operator",
        restrictionReason:
          policy.permissionLevel === 3
            ? policy.reasons.join("; ")
            : undefined,
        policySnapshot: policy,
        metadata: {
          phase: "26B.1",
          calendarAvailabilityAssessed: false,
          writeEnabled: false,
        },
      },
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch (err) {
    if (isUniqueViolation(err)) {
      const winner = await findActiveProposalForWork(input.workId);
      if (winner && sameProposedWindow(winner, { proposedStart, proposedEnd })) {
        await healWorkProjection(
          input.workId,
          winner,
          input.actor,
          clientId,
          "Healed after concurrent create race (unique active constraint).",
        );
        await recordSchedulingAudit({
          workId: input.workId,
          linkId: winner.id,
          clientId,
          action: "proposal_reused",
          detail: "Concurrent create resolved to existing proposal.",
          actor: input.actor,
        });
        return {
          link: winner,
          policy:
            (winner.policySnapshot as SchedulingPolicyEvidence) ?? policy,
          reused: true,
        };
      }
      throw new ConcurrentProposalMutationError(
        "A concurrent scheduling proposal was created. Review or adjust the existing proposal in Scheduling.",
      );
    }
    throw err;
  }

  let link = mapLink(created);

  // Race heal: if another active appeared, supersede this draft and resolve.
  const afterCreate = await findActiveProposalsForWork(input.workId);
  const others = afterCreate.filter((p) => p.id !== link.id);
  if (others.length > 0) {
    const winner = selectAuthoritativeActiveProposal(others)!;
    await supersedeScheduleProposal(
      link.id,
      input.actor,
      "Superseded — lost concurrent create race.",
      winner.id,
    );
    if (sameProposedWindow(winner, { proposedStart, proposedEnd })) {
      await healWorkProjection(
        input.workId,
        winner,
        input.actor,
        clientId,
        "Healed after concurrent create; returned winning proposal.",
      );
      return {
        link: winner,
        policy:
          (winner.policySnapshot as SchedulingPolicyEvidence) ?? policy,
        reused: true,
      };
    }
    throw new ConcurrentProposalMutationError(
      activeProposalConflictMessage(winner.id),
    );
  }

  // draft → proposed
  assertScheduleStatusTransition(link.status, "proposed");
  link = await updateLinkStatus(link.id, {
    status: "proposed",
    approvalStatus: "none",
  });

  if (policy.decision === "require-approval" || policy.permissionLevel === 1) {
    assertScheduleStatusTransition(link.status, "approval_required");
    link = await updateLinkStatus(link.id, {
      status: "approval_required",
      approvalStatus: "pending",
    });
  } else if (policy.decision === "allow-direct") {
    // Level 2: proposed → approved (auto) → pending_calendar_write (NOT scheduled)
    assertScheduleStatusTransition(link.status, "approved");
    link = await updateLinkStatus(link.id, {
      status: "approved",
      approvalStatus: "auto_approved",
      approvedBy: input.actor.userId ?? undefined,
    });
    assertScheduleStatusTransition(link.status, "pending_calendar_write");
    link = await updateLinkStatus(link.id, {
      status: "pending_calendar_write",
      approvalStatus: "auto_approved",
      syncStatus: syncStatusAfterApproval(),
    });
  }

  if (link.status === "pending_calendar_write") {
    await applyWorkScheduleProjection(
      input.workId,
      projectionForPendingCalendarWrite(link.id, proposedStart, proposedEnd),
    );
    await recordSchedulingAudit({
      workId: input.workId,
      linkId: link.id,
      clientId,
      action: "pending_calendar_write",
      detail:
        "Auto-approved; awaiting Google Calendar write (not scheduled yet).",
      actor: input.actor,
    });
    await recordSchedulingAudit({
      workId: input.workId,
      linkId: link.id,
      clientId,
      action: "projection_applied",
      detail: "Work projection set to pending_calendar_write.",
      actor: input.actor,
    });
  } else {
    await applyWorkScheduleProjection(
      input.workId,
      projectionForProposed(link.id, proposedStart, proposedEnd),
    );
    await recordSchedulingAudit({
      workId: input.workId,
      linkId: link.id,
      clientId,
      action: "projection_applied",
      detail: "Work schedule projection set to proposed.",
      actor: input.actor,
    });
  }

  await recordSchedulingAudit({
    workId: input.workId,
    linkId: link.id,
    clientId,
    action: "proposal_created",
    detail: `Proposal ${link.status} (Level ${policy.permissionLevel}). ${evidenceSummaryText(policy)}`,
    actor: input.actor,
    metadata: { policy },
  });

  if (link.status === "approval_required") {
    await recordSchedulingAudit({
      workId: input.workId,
      linkId: link.id,
      clientId,
      action: "approval_requested",
      detail: "Awaiting founder approval.",
      actor: input.actor,
    });
  }

  await emitFlow(
    "schedule.proposed",
    input.workId,
    clientId,
    input.actor,
    "none",
    link.status,
  );

  return { link, policy };
}

export async function updateScheduleProposal(
  input: UpdateScheduleProposalInput,
): Promise<WorkScheduleLinkRecord> {
  assertCapability(input.actor, "scheduling.suggest");
  const existing = await loadLink(input.linkId);
  if (
    existing.status !== "draft" &&
    existing.status !== "proposed" &&
    existing.status !== "approval_required" &&
    existing.status !== "rejected"
  ) {
    throw new Error(
      `Cannot update proposal in status ${existing.status}. Review or adjust the existing proposal in Scheduling.`,
    );
  }

  if (
    !actorHasCapability(input.actor, "scheduling.approve") &&
    existing.requestedById != null &&
    input.actor.userId != null &&
    existing.requestedById !== input.actor.userId
  ) {
    throw new Error("You can only adjust your own proposals.");
  }

  const proposedStart = input.proposedStart ?? existing.proposedStart;
  const proposedEnd = input.proposedEnd ?? existing.proposedEnd;
  const timezone = input.timezone ?? existing.timezone;
  const durationMinutes =
    input.durationMinutes ??
    durationFromRange(proposedStart, proposedEnd);

  const { work, clientId } = await loadWorkContext(existing.workId);
  const policy = evaluateSchedulingPolicy({
    actor: input.actor,
    work,
    slot: { proposedStart, proposedEnd, timezone, durationMinutes },
    intent: "suggest",
  });

  if (!policy.policyValid) {
    throw new Error(
      policy.blockingReasons.join(" ") || "Updated slot failed policy.",
    );
  }

  // Ensure no other active sibling remains (adjust updates in place).
  const actives = await findActiveProposalsForWork(existing.workId);
  for (const sibling of actives) {
    if (sibling.id === existing.id) continue;
    await supersedeScheduleProposal(
      sibling.id,
      input.actor,
      "Superseded — replaced by adjustment of active proposal.",
      existing.id,
    );
  }

  let link = await updateLinkStatus(input.linkId, {
    proposedStart,
    proposedEnd,
    timezone,
    durationMinutes,
    schedulingReason: input.schedulingReason ?? existing.schedulingReason,
    evidenceSummary: evidenceSummaryText(policy),
    confidence: policy.confidence,
    permissionLevel: String(policy.permissionLevel),
    schedulingMode: policy.schedulingMode,
    policySnapshot: policy,
    restrictionReason:
      policy.permissionLevel === 3 ? policy.reasons.join("; ") : null,
  });

  if (
    link.status === "proposed" ||
    link.status === "rejected" ||
    link.status === "draft"
  ) {
    if (link.status === "rejected" || link.status === "draft") {
      assertScheduleStatusTransition(link.status, "proposed");
      link = await updateLinkStatus(link.id, {
        status: "proposed",
        approvalStatus: "none",
        rejectionReason: null,
      });
    }
    assertScheduleStatusTransition(link.status, "approval_required");
    link = await updateLinkStatus(link.id, {
      status: "approval_required",
      approvalStatus: "pending",
    });
  }

  await applyWorkScheduleProjection(
    existing.workId,
    projectionForProposed(link.id, proposedStart, proposedEnd),
  );

  await recordSchedulingAudit({
    workId: existing.workId,
    linkId: link.id,
    clientId,
    action: "proposal_updated",
    detail: "Schedule proposal adjusted to a new candidate window.",
    actor: input.actor,
    metadata: { policy },
  });

  return link;
}

export async function requestScheduleApproval(
  linkId: number,
  actor: SchedulingActor,
): Promise<WorkScheduleLinkRecord> {
  assertCapability(actor, "scheduling.suggest");
  const existing = await loadLink(linkId);
  assertScheduleStatusTransition(existing.status, "approval_required");

  const link = await updateLinkStatus(linkId, {
    status: "approval_required",
    approvalStatus: "pending",
  });

  const { clientId } = await loadWorkContext(existing.workId);
  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "approval_requested",
    detail: "Approval requested.",
    actor,
  });

  await emitFlow(
    "schedule.approval-requested",
    existing.workId,
    clientId,
    actor,
    existing.status,
    "approval_required",
  );

  return link;
}

/**
 * Approve → pending_calendar_write.
 * Does NOT mark Work or link as scheduled (requires future Google event).
 */
export async function approveScheduleProposal(
  linkId: number,
  actor: SchedulingActor,
): Promise<WorkScheduleLinkRecord> {
  assertCapability(actor, "scheduling.approve");
  const existing = await loadLink(linkId);
  assertScheduleStatusTransition(existing.status, "approved");

  let link = await updateLinkStatus(linkId, {
    status: "approved",
    approvalStatus: nextApprovalStatusForLifecycle("approved"),
    approvedBy: actor.userId ?? undefined,
  });

  assertScheduleStatusTransition(link.status, "pending_calendar_write");
  link = await updateLinkStatus(linkId, {
    status: "pending_calendar_write",
    syncStatus: syncStatusAfterApproval(),
  });

  await applyWorkScheduleProjection(
    existing.workId,
    projectionForPendingCalendarWrite(
      link.id,
      link.proposedStart,
      link.proposedEnd,
    ),
  );

  const { clientId } = await loadWorkContext(existing.workId);
  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "approved",
    detail:
      "Proposal approved. Awaiting Google Calendar write — not scheduled yet.",
    actor,
  });
  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "pending_calendar_write",
    detail: "Status set to pending_calendar_write; syncStatus=pending_write.",
    actor,
  });
  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "projection_applied",
    detail: "Work projection set to pending_calendar_write (not scheduled).",
    actor,
  });

  await emitFlow(
    "schedule.approved",
    existing.workId,
    clientId,
    actor,
    existing.status,
    "pending_calendar_write",
  );

  return link;
}

/**
 * Reserved for Phase 26C+: transition pending_calendar_write → scheduled
 * only when a confirmed Google event id is already linked.
 * Does not call Google Calendar APIs.
 */
export async function confirmScheduleAfterGoogleEvent(
  linkId: number,
  actor: SchedulingActor,
  googleEventId: string,
): Promise<WorkScheduleLinkRecord> {
  assertCapability(actor, "scheduling.approve");
  const existing = await loadLink(linkId);

  if (
    !canConfirmScheduledFromPendingWrite({
      status: existing.status,
      googleEventId: googleEventId || existing.googleEventId,
    })
  ) {
    throw new Error(
      "Cannot mark scheduled without pending_calendar_write status and a confirmed Google event id.",
    );
  }

  assertScheduleStatusTransition(existing.status, "scheduled");
  const link = await updateLinkStatus(linkId, {
    status: "scheduled",
    googleEventId: googleEventId.trim(),
    syncStatus: "synced",
  });

  await applyWorkScheduleProjection(
    existing.workId,
    projectionForScheduled(link.id, link.proposedStart, link.proposedEnd),
  );

  const { clientId } = await loadWorkContext(existing.workId);
  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "projection_applied",
    detail: "Work projection set to scheduled after confirmed Google event.",
    actor,
  });

  return link;
}

export async function rejectScheduleProposal(
  linkId: number,
  actor: SchedulingActor,
  reason: string,
): Promise<WorkScheduleLinkRecord> {
  assertCapability(actor, "scheduling.approve");
  const existing = await loadLink(linkId);
  assertScheduleStatusTransition(existing.status, "rejected");

  const link = await updateLinkStatus(linkId, {
    status: "rejected",
    approvalStatus: "rejected",
    rejectionReason: reason || "Rejected",
    approvedBy: actor.userId ?? undefined,
  });

  const { clientId, raw } = await loadWorkContext(existing.workId);
  const activeId = relId(raw.activeScheduleLink);
  if (activeId === linkId) {
    await clearWorkScheduleProjection(existing.workId);
    await recordSchedulingAudit({
      workId: existing.workId,
      linkId,
      clientId,
      action: "projection_cleared",
      detail: "Cleared Work projection after rejection.",
      actor,
    });
  }

  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "rejected",
    detail: reason || "Rejected",
    actor,
  });

  await emitFlow(
    "schedule.rejected",
    existing.workId,
    clientId,
    actor,
    existing.status,
    "rejected",
  );

  return link;
}

export async function cancelScheduleProposal(
  linkId: number,
  actor: SchedulingActor,
  reason?: string,
): Promise<WorkScheduleLinkRecord> {
  if (
    !actorHasCapability(actor, "scheduling.suggest") &&
    !actorHasCapability(actor, "scheduling.approve")
  ) {
    throw new Error("Scheduling permission denied: cannot cancel.");
  }

  const existing = await loadLink(linkId);

  if (
    !actorHasCapability(actor, "scheduling.approve") &&
    existing.requestedById != null &&
    actor.userId != null &&
    existing.requestedById !== actor.userId
  ) {
    throw new Error("You can only cancel your own proposals.");
  }

  assertScheduleStatusTransition(existing.status, "canceled");

  const link = await updateLinkStatus(linkId, {
    status: "canceled",
    canceledReason: reason ?? "Canceled",
  });

  const { clientId, raw } = await loadWorkContext(existing.workId);
  const activeId = relId(raw.activeScheduleLink);
  if (activeId === linkId) {
    await clearWorkScheduleProjection(existing.workId);
    await recordSchedulingAudit({
      workId: existing.workId,
      linkId,
      clientId,
      action: "projection_cleared",
      detail: "Cleared Work projection after cancel.",
      actor,
    });
  }

  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "canceled",
    detail: reason ?? "Canceled",
    actor,
  });

  await emitFlow(
    "schedule.canceled",
    existing.workId,
    clientId,
    actor,
    existing.status,
    "canceled",
  );

  return link;
}

export async function markScheduleCompleted(
  linkId: number,
  actor: SchedulingActor,
): Promise<WorkScheduleLinkRecord> {
  assertCapability(actor, "scheduling.approve");
  const existing = await loadLink(linkId);
  assertScheduleStatusTransition(existing.status, "completed");

  const link = await updateLinkStatus(linkId, {
    status: "completed",
  });

  const { clientId, raw } = await loadWorkContext(existing.workId);
  const activeId = relId(raw.activeScheduleLink);
  if (activeId === linkId) {
    await clearWorkScheduleProjection(existing.workId);
    await recordSchedulingAudit({
      workId: existing.workId,
      linkId,
      clientId,
      action: "projection_cleared",
      detail: "Cleared Work projection after schedule completed.",
      actor,
    });
  }

  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "completed",
    detail: "Scheduled block marked completed.",
    actor,
  });

  await emitFlow(
    "schedule.completed",
    existing.workId,
    clientId,
    actor,
    existing.status,
    "completed",
  );

  return link;
}

/**
 * Repair duplicate active proposals for one Work item.
 * Keeps the authoritative survivor; supersedes the rest.
 */
export async function repairActiveProposalsForWork(
  workId: number,
  actor: SchedulingActor,
  opts?: { dryRun?: boolean; reason?: string },
): Promise<{
  workId: number;
  retainedId: number | null;
  supersededIds: number[];
  projectionRepaired: boolean;
  dryRun: boolean;
}> {
  const dryRun = opts?.dryRun === true;
  const reason = opts?.reason ?? "Replaced during active proposal integrity cleanup";
  const actives = await findActiveProposalsForWork(workId);
  if (actives.length <= 1) {
    const sole = actives[0] ?? null;
    if (sole && !dryRun) {
      await healWorkProjection(
        workId,
        sole,
        actor,
        null,
        "Projection aligned to sole active proposal.",
      );
    }
    return {
      workId,
      retainedId: sole?.id ?? null,
      supersededIds: [],
      projectionRepaired: Boolean(sole),
      dryRun,
    };
  }

  const survivor = selectAuthoritativeActiveProposal(actives)!;
  const losers = actives.filter((p) => p.id !== survivor.id);

  if (!dryRun) {
    for (const loser of losers) {
      await supersedeScheduleProposal(loser.id, actor, reason, survivor.id);
    }
    const { clientId } = await loadWorkContext(workId);
    await healWorkProjection(
      workId,
      survivor,
      actor,
      clientId,
      "Projection repaired to surviving active proposal after integrity cleanup.",
    );
    await recordSchedulingAudit({
      workId,
      linkId: survivor.id,
      clientId,
      action: "integrity_repair",
      detail: `Retained #${survivor.id}; superseded ${losers.map((l) => l.id).join(", ")}.`,
      actor,
      metadata: {
        retainedId: survivor.id,
        supersededIds: losers.map((l) => l.id),
      },
    });
  }

  return {
    workId,
    retainedId: survivor.id,
    supersededIds: losers.map((l) => l.id),
    projectionRepaired: !dryRun,
    dryRun,
  };
}

export { evaluateSchedulingPolicy };
export {
  applyWorkScheduleProjection,
  clearWorkScheduleProjection,
};
