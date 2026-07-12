/**
 * Phase 25B — Scheduling audit adapter.
 * Uses Work activityHistory always; Activity Engine when client-linked.
 * Does not invent a parallel activity system.
 */

import "server-only";

import { publishActivity } from "@/lib/activity-engine";
import { appendWorkActivityEntry } from "@/lib/work/activity";
import type { SchedulingActor, SchedulingAuditAction } from "./types";

const ACTION_LABELS: Record<SchedulingAuditAction, string> = {
  proposal_created: "schedule.proposal-created",
  proposal_updated: "schedule.proposal-updated",
  approval_requested: "schedule.approval-requested",
  approved: "schedule.approved",
  rejected: "schedule.rejected",
  canceled: "schedule.canceled",
  completed: "schedule.completed",
  projection_applied: "schedule.projection-applied",
  projection_cleared: "schedule.projection-cleared",
  policy_blocked: "schedule.policy-blocked",
  override_used: "schedule.override-used",
};

const ACTIVITY_EVENT_TYPES: Partial<Record<SchedulingAuditAction, string>> = {
  proposal_created: "work.schedule-proposed",
  approval_requested: "work.schedule-approval-requested",
  approved: "work.schedule-approved",
  rejected: "work.schedule-rejected",
  canceled: "work.schedule-canceled",
  completed: "work.schedule-completed",
};

export interface SchedulingAuditInput {
  workId: number;
  linkId?: number | null;
  clientId?: number | null;
  action: SchedulingAuditAction;
  detail: string;
  actor: SchedulingActor;
  metadata?: Record<string, unknown>;
}

export async function recordSchedulingAudit(
  input: SchedulingAuditInput,
): Promise<void> {
  const actorLabel =
    input.actor.email ??
    input.actor.displayName ??
    (input.actor.userId != null ? `user:${input.actor.userId}` : "system");

  const action = ACTION_LABELS[input.action];
  await appendWorkActivityEntry(input.workId, {
    actor: actorLabel,
    action,
    detail: input.detail,
  });

  const eventType = ACTIVITY_EVENT_TYPES[input.action];
  if (eventType && input.clientId != null) {
    await publishActivity({
      eventType,
      title: detailTitle(input.action, input.detail),
      summary: input.detail,
      clientId: input.clientId,
      workId: input.workId,
      sourceModule: "Activity Engine",
      sourceType: "scheduling",
      sourceId: input.linkId ?? `work-${input.workId}-${input.action}`,
      author: actorLabel,
      importance: importanceFor(input.action),
      metadata: {
        schedulingAudit: true,
        action: input.action,
        linkId: input.linkId ?? null,
        ...input.metadata,
      },
      relatedLinks: [
        { label: "Work", href: `/admin/work/${input.workId}` },
      ],
      dedupe: false,
    });
  }
}

function detailTitle(action: SchedulingAuditAction, detail: string): string {
  switch (action) {
    case "proposal_created":
      return "Schedule proposal created";
    case "approval_requested":
      return "Schedule approval requested";
    case "approved":
      return "Schedule proposal approved";
    case "rejected":
      return "Schedule proposal rejected";
    case "canceled":
      return "Schedule canceled";
    case "completed":
      return "Scheduled block completed";
    default:
      return detail.slice(0, 80) || "Scheduling update";
  }
}

function importanceFor(
  action: SchedulingAuditAction,
): "low" | "normal" | "high" | "critical" {
  switch (action) {
    case "rejected":
    case "policy_blocked":
      return "high";
    case "approved":
    case "canceled":
      return "normal";
    default:
      return "normal";
  }
}
