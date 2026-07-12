/**
 * Phase 25B / 26C — Scheduling audit adapter.
 * Uses Work activityHistory always; Activity Engine when client-linked.
 *
 * Secondary activity failures must never roll back calendar writes or
 * primary scheduling mutations.
 */

import "server-only";

import { publishActivity } from "@/lib/activity-engine";
import { appendWorkActivityEntry } from "@/lib/work/activity";
import type { SchedulingActor, SchedulingAuditAction } from "./types";

const ACTION_LABELS: Record<SchedulingAuditAction, string> = {
  proposal_created: "schedule.proposal-created",
  proposal_updated: "schedule.proposal-updated",
  proposal_superseded: "schedule.proposal-superseded",
  proposal_reused: "schedule.proposal-reused",
  approval_requested: "schedule.approval-requested",
  approved: "schedule.approved",
  pending_calendar_write: "schedule.pending-calendar-write",
  calendar_write_started: "schedule.calendar-write-started",
  calendar_created: "schedule.calendar-created",
  calendar_create_failed: "schedule.calendar-create-failed",
  calendar_linked: "schedule.calendar-linked",
  rejected: "schedule.rejected",
  canceled: "schedule.canceled",
  completed: "schedule.completed",
  projection_applied: "schedule.projection-applied",
  projection_cleared: "schedule.projection-cleared",
  projection_healed: "schedule.projection-healed",
  integrity_repair: "schedule.integrity-repair",
  policy_blocked: "schedule.policy-blocked",
  override_used: "schedule.override-used",
};

const ACTIVITY_EVENT_TYPES: Partial<Record<SchedulingAuditAction, string>> = {
  proposal_created: "work.schedule-proposed",
  approval_requested: "work.schedule-approval-requested",
  approved: "work.schedule-approved",
  pending_calendar_write: "work.schedule-pending-calendar-write",
  calendar_write_started: "work.schedule-calendar-write-started",
  calendar_created: "work.schedule-calendar-created",
  calendar_create_failed: "work.schedule-calendar-create-failed",
  calendar_linked: "work.schedule-calendar-linked",
  rejected: "work.schedule-rejected",
  canceled: "work.schedule-canceled",
  completed: "work.schedule-completed",
  proposal_superseded: "work.schedule-proposal-superseded",
  integrity_repair: "work.schedule-integrity-repair",
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
  try {
    await appendWorkActivityEntry(input.workId, {
      actor: actorLabel,
      action,
      detail:
        input.linkId != null
          ? `[link:${input.linkId}] ${input.detail}`
          : input.detail,
    });
  } catch (err) {
    console.warn(
      "[KXD Scheduling] Work activityHistory append skipped:",
      err instanceof Error ? err.message : String(err),
    );
  }

  const eventType = ACTIVITY_EVENT_TYPES[input.action];
  if (eventType && input.clientId != null) {
    try {
      await publishActivity({
        eventType,
        title: detailTitle(input.action, input.detail),
        summary: input.detail,
        clientId: input.clientId,
        workId: input.workId,
        sourceModule: "Work",
        sourceType: "scheduling",
        sourceId: input.linkId ?? `work-${input.workId}-${input.action}`,
        author: actorLabel,
        importance: importanceFor(input.action),
        metadata: {
          schedulingAudit: true,
          action: input.action,
          linkId: input.linkId ?? null,
          proposalId: input.linkId ?? null,
          workId: input.workId,
          ...input.metadata,
        },
        relatedLinks: [
          { label: "Work", href: `/admin/work/${input.workId}` },
          {
            label: "Scheduling",
            href: "/admin/work/scheduling",
          },
        ],
        dedupe: false,
      });
    } catch (err) {
      console.warn(
        "[KXD Scheduling] Activity publish skipped:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

function detailTitle(action: SchedulingAuditAction, detail: string): string {
  switch (action) {
    case "proposal_created":
      return "Schedule proposal created";
    case "proposal_reused":
      return "Schedule proposal reused";
    case "proposal_superseded":
      return "Schedule proposal superseded";
    case "approval_requested":
      return "Schedule approval requested";
    case "approved":
      return "Schedule proposal approved";
    case "pending_calendar_write":
      return "Pending calendar write";
    case "calendar_write_started":
      return "Calendar write started";
    case "calendar_created":
      return "Google Calendar event created";
    case "calendar_create_failed":
      return "Calendar write failed";
    case "calendar_linked":
      return "Schedule linked to Google Calendar";
    case "rejected":
      return "Schedule proposal rejected";
    case "canceled":
      return "Schedule canceled";
    case "completed":
      return "Scheduled block completed";
    case "integrity_repair":
      return "Scheduling integrity repair";
    case "projection_healed":
      return "Schedule projection healed";
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
    case "integrity_repair":
    case "calendar_create_failed":
      return "high";
    case "approved":
    case "pending_calendar_write":
    case "calendar_created":
    case "calendar_linked":
    case "canceled":
      return "normal";
    default:
      return "normal";
  }
}
