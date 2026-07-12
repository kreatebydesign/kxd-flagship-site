/**
 * Phase 25B — Scheduling domain services.
 * Canonical mutation surface for proposals, approvals, and Work projections.
 * No Google Calendar reads or writes.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import { processOperationalFlow } from "@/lib/operational-flow";
import type { OperationalTransitionKind } from "@/lib/operational-flow/types";
import { WORK_COLLECTION } from "@/lib/work/constants";
import { recordSchedulingAudit } from "./audit";
import {
  assertScheduleStatusTransition,
  nextApprovalStatusForLifecycle,
  syncStatusAfterLocalSchedule,
} from "./lifecycle";
import { assertCapability, actorHasCapability } from "./permissions";
import { evaluateSchedulingPolicy } from "./policy";
import {
  applyWorkScheduleProjection,
  clearWorkScheduleProjection,
  projectionForProposed,
  projectionForScheduled,
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

async function emitFlow(
  kind: OperationalTransitionKind,
  workId: number,
  clientId: number | null,
  actor: SchedulingActor,
  previousStatus?: string | null,
  nextStatus?: string | null,
): Promise<void> {
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
}> {
  assertCapability(input.actor, "scheduling.suggest");

  const { work, clientId } = await loadWorkContext(input.workId);
  const timezone = input.timezone?.trim() || KXD_BUSINESS_TIMEZONE;
  const proposedStart = input.proposedStart;
  const proposedEnd = input.proposedEnd;
  const durationMinutes =
    input.durationMinutes && input.durationMinutes > 0
      ? input.durationMinutes
      : durationFromRange(proposedStart, proposedEnd);

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

  const payload = await getPayload({ config });

  // Create as draft, then transition per policy.
  const created = (await payload.create({
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
        phase: "25B",
        calendarAvailabilityAssessed: false,
      },
    },
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  let link = mapLink(created);

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
    // Level 2: proposed → approved (auto) → scheduled (local; pending Google write)
    assertScheduleStatusTransition(link.status, "approved");
    link = await updateLinkStatus(link.id, {
      status: "approved",
      approvalStatus: "auto_approved",
      approvedBy: input.actor.userId ?? undefined,
    });
    assertScheduleStatusTransition(link.status, "scheduled");
    link = await updateLinkStatus(link.id, {
      status: "scheduled",
      approvalStatus: "auto_approved",
      syncStatus: syncStatusAfterLocalSchedule(),
    });
  }

  if (link.status === "scheduled") {
    await applyWorkScheduleProjection(
      input.workId,
      projectionForScheduled(link.id, proposedStart, proposedEnd),
    );
    await recordSchedulingAudit({
      workId: input.workId,
      linkId: link.id,
      clientId,
      action: "projection_applied",
      detail: "Work schedule projection set to scheduled (sync pending).",
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
      `Cannot update proposal in status ${existing.status}.`,
    );
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

  // Re-enter approval_required when still in proposal lane
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
    detail: "Schedule proposal updated.",
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

  assertScheduleStatusTransition(link.status, "scheduled");
  link = await updateLinkStatus(linkId, {
    status: "scheduled",
    syncStatus: syncStatusAfterLocalSchedule(),
  });

  await applyWorkScheduleProjection(
    existing.workId,
    projectionForScheduled(
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
      "Proposal approved. Marked scheduled locally; Google Calendar write deferred.",
    actor,
  });
  await recordSchedulingAudit({
    workId: existing.workId,
    linkId,
    clientId,
    action: "projection_applied",
    detail: "Work projection set to scheduled.",
    actor,
  });

  await emitFlow(
    "schedule.approved",
    existing.workId,
    clientId,
    actor,
    existing.status,
    "scheduled",
  );

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

export { evaluateSchedulingPolicy };
export {
  applyWorkScheduleProjection,
  clearWorkScheduleProjection,
};
