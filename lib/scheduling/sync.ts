/**
 * Phase 27A — Calendar synchronization & recovery foundation.
 *
 * Google Calendar is source of truth for event state.
 * KXD OS is source of truth for business intent and Work context.
 *
 * Read + reconcile only — never creates, updates, or deletes Google events.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { CalendarEventReader } from "./calendar-providers";
import { getCalendarEventReader } from "./calendar-context";
import { recordSchedulingAudit } from "./audit";
import {
  applyWorkScheduleProjection,
  projectionForScheduled,
  projectionForSyncError,
} from "./projections";
import {
  compareLinkedEventToSchedule,
  missingEventDriftReport,
  type SyncDriftReport,
} from "./sync-compare";
import {
  SCHEDULE_LINK_COLLECTION,
  type ScheduleExternalChangeClass,
  type ScheduleRecoveryState,
  type ScheduleSyncStatus,
  type SchedulingActor,
  type SchedulingAuditAction,
  type WorkScheduleLinkRecord,
} from "./types";

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

function mapLink(doc: AnyDoc): WorkScheduleLinkRecord {
  return {
    id: doc.id as number,
    workId: relId(doc.work) ?? 0,
    calendarOwnerId: relId(doc.calendarOwner),
    requestedById: relId(doc.requestedBy),
    approvedById: relId(doc.approvedBy),
    status: doc.status,
    approvalStatus: doc.approvalStatus,
    syncStatus: doc.syncStatus,
    schedulingMode: doc.schedulingMode,
    permissionLevel: Number(doc.permissionLevel) as 1 | 2 | 3,
    proposedStart: String(doc.proposedStart),
    proposedEnd: String(doc.proposedEnd),
    timezone: String(doc.timezone ?? "America/Los_Angeles"),
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
    calendarWriteAt: doc.calendarWriteAt ? String(doc.calendarWriteAt) : null,
    lastSyncAt: doc.lastSyncAt ? String(doc.lastSyncAt) : null,
    lastSyncAttemptAt: doc.lastSyncAttemptAt
      ? String(doc.lastSyncAttemptAt)
      : null,
    syncFailureCode: doc.syncFailureCode ? String(doc.syncFailureCode) : null,
    syncFailureMessage: doc.syncFailureMessage
      ? String(doc.syncFailureMessage)
      : null,
    externalChangeClass: (doc.externalChangeClass ??
      "none") as ScheduleExternalChangeClass,
    externalChangeAt: doc.externalChangeAt
      ? String(doc.externalChangeAt)
      : null,
    recoveryState: (doc.recoveryState ?? "none") as ScheduleRecoveryState,
    providerEventStatus: doc.providerEventStatus
      ? String(doc.providerEventStatus)
      : null,
    observedTitle: doc.observedTitle ? String(doc.observedTitle) : null,
    observedLocation: doc.observedLocation
      ? String(doc.observedLocation)
      : null,
    cancelledRemoteAt: doc.cancelledRemoteAt
      ? String(doc.cancelledRemoteAt)
      : null,
    missingRemoteAt: doc.missingRemoteAt ? String(doc.missingRemoteAt) : null,
    policySnapshot: doc.policySnapshot ?? null,
    conflictSnapshot: doc.conflictSnapshot ?? null,
    displacedItemSnapshot: doc.displacedItemSnapshot ?? null,
    metadata: (doc.metadata as Record<string, unknown>) ?? null,
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
  };
}

export interface CalendarSyncResult {
  link: WorkScheduleLinkRecord;
  outcome:
    | "unchanged"
    | "metadata_only"
    | "schedule_updated"
    | "descriptive_change"
    | "cancelled"
    | "missing"
    | "authorization_failure"
    | "provider_failure"
    | "not_linkable"
    | "skipped";
  externalChangeClass: ScheduleExternalChangeClass;
  recoveryState: ScheduleRecoveryState;
  syncStatus: ScheduleSyncStatus;
  activityPublished: boolean;
  workProjectionUpdated: boolean;
  googleEventIdStable: boolean;
  message: string;
  drift: SyncDriftReport | null;
}

export interface SyncLinkedScheduleOptions {
  reader?: CalendarEventReader;
  /** Injected for tests — never used to create Google events. */
  now?: () => string;
}

function truncateDescription(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > 4000 ? t.slice(0, 4000) : t;
}

function durationMinutes(start: string, end: string): number {
  const ms = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 60_000);
}

function shouldPublishActivity(input: {
  priorClass: ScheduleExternalChangeClass;
  priorRecovery: ScheduleRecoveryState;
  nextClass: ScheduleExternalChangeClass;
  nextRecovery: ScheduleRecoveryState;
  outcome: CalendarSyncResult["outcome"];
  scheduleTimesChanged: boolean;
}): boolean {
  if (
    input.outcome === "unchanged" ||
    input.outcome === "metadata_only" ||
    input.outcome === "skipped" ||
    input.outcome === "not_linkable"
  ) {
    return false;
  }
  if (input.scheduleTimesChanged) return true;
  if (input.priorClass !== input.nextClass) return true;
  if (input.priorRecovery !== input.nextRecovery) return true;
  return false;
}

function auditActionForOutcome(
  outcome: CalendarSyncResult["outcome"],
): SchedulingAuditAction | null {
  switch (outcome) {
    case "schedule_updated":
    case "descriptive_change":
      return "calendar_external_change";
    case "cancelled":
      return "calendar_event_cancelled";
    case "missing":
      return "calendar_event_missing";
    case "authorization_failure":
    case "provider_failure":
      return "calendar_sync_failed";
    case "unchanged":
    case "metadata_only":
      return null;
    default:
      return null;
  }
}

/**
 * Synchronize one WorkScheduleLink that already has a confirmed Google event id.
 * Idempotent. Never calls calendar create/update/delete.
 */
export async function syncLinkedScheduleFromCalendar(
  linkId: number,
  actor: SchedulingActor,
  opts?: SyncLinkedScheduleOptions,
): Promise<CalendarSyncResult> {
  const payload = await getPayload({ config });
  const now = (opts?.now ?? (() => new Date().toISOString()))();
  const reader = opts?.reader ?? getCalendarEventReader();

  const existing = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    id: linkId,
    depth: 0,
    overrideAccess: true,
  });

  const link = mapLink(existing as AnyDoc);
  const googleEventId = (link.googleEventId ?? "").trim();
  const googleCalendarId = (link.googleCalendarId ?? "").trim();

  if (!googleEventId || !googleCalendarId) {
    return {
      link,
      outcome: "not_linkable",
      externalChangeClass: link.externalChangeClass,
      recoveryState: link.recoveryState,
      syncStatus: link.syncStatus,
      activityPublished: false,
      workProjectionUpdated: false,
      googleEventIdStable: true,
      message:
        "No confirmed Google Calendar event is linked. Synchronization requires an existing event.",
      drift: null,
    };
  }

  if (
    link.status !== "scheduled" &&
    link.status !== "reschedule_required" &&
    link.status !== "sync_error"
  ) {
    return {
      link,
      outcome: "skipped",
      externalChangeClass: link.externalChangeClass,
      recoveryState: link.recoveryState,
      syncStatus: link.syncStatus,
      activityPublished: false,
      workProjectionUpdated: false,
      googleEventIdStable: true,
      message: `Synchronization is available after a confirmed calendar write (status=${link.status}).`,
      drift: null,
    };
  }

  const workDoc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    id: link.workId,
    depth: 0,
    overrideAccess: true,
  });
  const workTitle =
    workDoc && typeof (workDoc as AnyDoc).title === "string"
      ? String((workDoc as AnyDoc).title)
      : null;
  const clientId = relId((workDoc as AnyDoc)?.client);

  const read = await reader.getEvent({
    calendarId: googleCalendarId,
    eventId: googleEventId,
  });

  const priorClass = link.externalChangeClass;
  const priorRecovery = link.recoveryState;
  const wasRecovering =
    priorRecovery === "missing_remote" ||
    priorRecovery === "cancelled_remote";

  // --- Provider / auth failure: preserve projection + event metadata ---
  if (read.outcome === "failure") {
    const classification = read.failure.classification;
    const externalChangeClass: ScheduleExternalChangeClass =
      classification === "authorization_failure" ||
      classification === "authentication_failure"
        ? "authorization_failure"
        : classification === "provider_unavailable"
          ? "provider_unavailable"
          : classification === "transient_error"
            ? "transient_error"
            : "manual_review";

    const outcome: CalendarSyncResult["outcome"] =
      externalChangeClass === "authorization_failure"
        ? "authorization_failure"
        : "provider_failure";

    const updated = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: SCHEDULE_LINK_COLLECTION as any,
      id: linkId,
      data: {
        lastSyncAttemptAt: now,
        syncStatus: "error",
        syncFailureCode: classification,
        syncFailureMessage: read.failure.message.slice(0, 500),
        externalChangeClass,
        // Preserve googleEventId, times, recovery evidence, Work projection.
      },
      depth: 0,
      overrideAccess: true,
    });

    const mapped = mapLink(updated as AnyDoc);
    const publish = shouldPublishActivity({
      priorClass,
      priorRecovery,
      nextClass: externalChangeClass,
      nextRecovery: mapped.recoveryState,
      outcome,
      scheduleTimesChanged: false,
    });

    let activityPublished = false;
    if (publish) {
      await recordSchedulingAudit({
        workId: link.workId,
        linkId,
        clientId,
        action: "calendar_sync_failed",
        detail: read.failure.message,
        actor,
        metadata: {
          hasGoogleEventId: true,
          externalChangeClass,
          recoveryState: mapped.recoveryState,
          providerFailure: classification,
          retryable: read.failure.retryable,
        },
      });
      activityPublished = true;
    }

    return {
      link: mapped,
      outcome,
      externalChangeClass,
      recoveryState: mapped.recoveryState,
      syncStatus: "error",
      activityPublished,
      workProjectionUpdated: false,
      googleEventIdStable: mapped.googleEventId === googleEventId,
      message: read.failure.message,
      drift: null,
    };
  }

  // --- Missing event ---
  if (read.outcome === "missing") {
    const drift = missingEventDriftReport();
    const updated = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: SCHEDULE_LINK_COLLECTION as any,
      id: linkId,
      data: {
        lastSyncAttemptAt: now,
        lastSyncAt: now,
        syncStatus: "deleted_remotely",
        syncFailureCode: null,
        syncFailureMessage: null,
        externalChangeClass: "missing",
        externalChangeAt: link.externalChangeAt ?? now,
        recoveryState: "missing_remote",
        missingRemoteAt: link.missingRemoteAt ?? now,
        providerEventStatus: null,
        // Preserve googleEventId / calendar id / html link for recovery evidence.
      },
      depth: 0,
      overrideAccess: true,
    });

    await applyWorkScheduleProjection(
      link.workId,
      projectionForSyncError(linkId, link.proposedStart, link.proposedEnd),
    );

    const mapped = mapLink(updated as AnyDoc);
    const publish = shouldPublishActivity({
      priorClass,
      priorRecovery,
      nextClass: "missing",
      nextRecovery: "missing_remote",
      outcome: "missing",
      scheduleTimesChanged: false,
    });

    let activityPublished = false;
    if (publish) {
      await recordSchedulingAudit({
        workId: link.workId,
        linkId,
        clientId,
        action: "calendar_event_missing",
        detail:
          "Google Calendar event could not be found. Work was preserved; the event was not recreated.",
        actor,
        metadata: {
          hasGoogleEventId: true,
          externalChangeClass: "missing",
          recoveryState: "missing_remote",
        },
      });
      activityPublished = true;
    }

    return {
      link: mapped,
      outcome: "missing",
      externalChangeClass: "missing",
      recoveryState: "missing_remote",
      syncStatus: "deleted_remotely",
      activityPublished,
      workProjectionUpdated: true,
      googleEventIdStable: mapped.googleEventId === googleEventId,
      message:
        "Calendar event is missing. Work still exists; KXD OS did not recreate the event.",
      drift,
    };
  }

  // --- Found event ---
  const event = read.event;
  const drift = compareLinkedEventToSchedule(link, event, workTitle);

  if (drift.kind === "cancelled") {
    const updated = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: SCHEDULE_LINK_COLLECTION as any,
      id: linkId,
      data: {
        lastSyncAttemptAt: now,
        lastSyncAt: now,
        syncStatus: "deleted_remotely",
        syncFailureCode: null,
        syncFailureMessage: null,
        externalChangeClass: "cancelled",
        externalChangeAt: link.externalChangeAt ?? now,
        recoveryState: "cancelled_remote",
        cancelledRemoteAt: link.cancelledRemoteAt ?? now,
        providerEventStatus: "cancelled",
        googleEventEtag: drift.observedEtag ?? link.googleEventEtag ?? undefined,
        googleEventUpdatedAt:
          drift.observedUpdatedAt ?? link.googleEventUpdatedAt ?? undefined,
        googleEventHtmlLink:
          event.htmlLink ?? link.googleEventHtmlLink ?? undefined,
        observedTitle: drift.observedTitle ?? undefined,
        observedLocation: drift.observedLocation ?? undefined,
        metadata: {
          ...(link.metadata ?? {}),
          observedCalendarDescription: truncateDescription(
            drift.observedDescription,
          ),
        },
      },
      depth: 0,
      overrideAccess: true,
    });

    await applyWorkScheduleProjection(
      link.workId,
      projectionForSyncError(linkId, link.proposedStart, link.proposedEnd),
    );

    const mapped = mapLink(updated as AnyDoc);
    const publish = shouldPublishActivity({
      priorClass,
      priorRecovery,
      nextClass: "cancelled",
      nextRecovery: "cancelled_remote",
      outcome: "cancelled",
      scheduleTimesChanged: false,
    });

    let activityPublished = false;
    if (publish) {
      await recordSchedulingAudit({
        workId: link.workId,
        linkId,
        clientId,
        action: "calendar_event_cancelled",
        detail:
          "Google Calendar event was cancelled externally. Work was preserved; no replacement event was created.",
        actor,
        metadata: {
          hasGoogleEventId: true,
          externalChangeClass: "cancelled",
          recoveryState: "cancelled_remote",
        },
      });
      activityPublished = true;
    }

    return {
      link: mapped,
      outcome: "cancelled",
      externalChangeClass: "cancelled",
      recoveryState: "cancelled_remote",
      syncStatus: "deleted_remotely",
      activityPublished,
      workProjectionUpdated: true,
      googleEventIdStable: mapped.googleEventId === googleEventId,
      message:
        "Calendar event was cancelled in Google. Work still exists; KXD OS did not recreate the event.",
      drift,
    };
  }

  const recoveringNow =
    wasRecovering &&
    (drift.kind === "none" ||
      drift.kind === "metadata_only" ||
      drift.kind === "schedule_impacting" ||
      drift.kind === "descriptive");

  const nextStart =
    drift.kind === "schedule_impacting" && drift.observedStart
      ? drift.observedStart
      : link.proposedStart;
  const nextEnd =
    drift.kind === "schedule_impacting" && drift.observedEnd
      ? drift.observedEnd
      : link.proposedEnd;
  const nextTimezone =
    drift.kind === "schedule_impacting" && drift.observedTimezone
      ? drift.observedTimezone
      : link.timezone;

  const scheduleTimesChanged =
    nextStart !== link.proposedStart || nextEnd !== link.proposedEnd;

  let outcome: CalendarSyncResult["outcome"] = "unchanged";
  let syncStatus: ScheduleSyncStatus = "synced";
  let recoveryState: ScheduleRecoveryState = recoveringNow
    ? "restored"
    : "none";
  let externalChangeClass: ScheduleExternalChangeClass = "none";

  if (drift.kind === "schedule_impacting") {
    outcome = "schedule_updated";
    syncStatus = "stale";
    recoveryState = recoveringNow ? "restored" : "review_required";
    externalChangeClass = "schedule_impacting";
  } else if (drift.kind === "descriptive") {
    outcome = "descriptive_change";
    syncStatus = "stale";
    recoveryState = recoveringNow ? "restored" : "review_required";
    externalChangeClass = "descriptive";
  } else if (drift.kind === "metadata_only") {
    outcome = "metadata_only";
    syncStatus = "synced";
    externalChangeClass = "metadata_only";
  } else {
    outcome = recoveringNow ? "unchanged" : "unchanged";
    if (recoveringNow) {
      outcome = "unchanged";
      recoveryState = "restored";
    }
  }

  if (recoveringNow && drift.kind === "none") {
    // Explicit recovery path — still quiet if repeating restored state.
    externalChangeClass = "none";
    syncStatus = "synced";
  }

  const updated = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    id: linkId,
    data: {
      lastSyncAttemptAt: now,
      lastSyncAt: now,
      syncStatus,
      syncFailureCode: null,
      syncFailureMessage: null,
      externalChangeClass,
      externalChangeAt:
        externalChangeClass === "none" ||
        externalChangeClass === "metadata_only"
          ? link.externalChangeAt
          : (link.externalChangeAt ?? now),
      recoveryState,
      providerEventStatus: drift.observedStatus ?? event.status ?? "confirmed",
      proposedStart: nextStart,
      proposedEnd: nextEnd,
      timezone: nextTimezone,
      durationMinutes: durationMinutes(nextStart, nextEnd) || link.durationMinutes,
      googleEventEtag: drift.observedEtag ?? link.googleEventEtag ?? undefined,
      googleEventUpdatedAt:
        drift.observedUpdatedAt ?? link.googleEventUpdatedAt ?? undefined,
      googleEventHtmlLink:
        event.htmlLink ?? link.googleEventHtmlLink ?? undefined,
      observedTitle: drift.observedTitle ?? undefined,
      observedLocation: drift.observedLocation ?? undefined,
      cancelledRemoteAt: recoveringNow ? null : link.cancelledRemoteAt,
      missingRemoteAt: recoveringNow ? null : link.missingRemoteAt,
      metadata: {
        ...(link.metadata ?? {}),
        observedCalendarDescription: truncateDescription(
          drift.observedDescription,
        ),
      },
    },
    depth: 0,
    overrideAccess: true,
  });

  let workProjectionUpdated = false;
  if (
    scheduleTimesChanged ||
    recoveringNow ||
    priorRecovery === "missing_remote" ||
    priorRecovery === "cancelled_remote"
  ) {
    // Restored / schedule-impacting → actively scheduled again.
    // Descriptive-only does not change Work times.
    if (
      recoveringNow ||
      scheduleTimesChanged ||
      priorRecovery === "missing_remote" ||
      priorRecovery === "cancelled_remote"
    ) {
      await applyWorkScheduleProjection(
        link.workId,
        projectionForScheduled(linkId, nextStart, nextEnd),
      );
      workProjectionUpdated = true;
    }
  }

  const mapped = mapLink(updated as AnyDoc);

  let activityPublished = false;
  if (recoveringNow) {
    await recordSchedulingAudit({
      workId: link.workId,
      linkId,
      clientId,
      action: "calendar_recovery_restored",
      detail:
        "Linked Google Calendar event is available again. Work scheduling projection was restored.",
      actor,
      metadata: {
        hasGoogleEventId: true,
        externalChangeClass,
        recoveryState,
        oldStart: link.proposedStart,
        oldEnd: link.proposedEnd,
        newStart: nextStart,
        newEnd: nextEnd,
      },
    });
    activityPublished = true;
  } else {
    const publish = shouldPublishActivity({
      priorClass,
      priorRecovery,
      nextClass: externalChangeClass,
      nextRecovery: recoveryState,
      outcome,
      scheduleTimesChanged,
    });
    const action = auditActionForOutcome(outcome);
    if (publish && action) {
      await recordSchedulingAudit({
        workId: link.workId,
        linkId,
        clientId,
        action,
        detail:
          outcome === "schedule_updated"
            ? "Google Calendar times changed externally. KXD OS updated the linked schedule projection."
            : outcome === "descriptive_change"
              ? "Google Calendar title, description, or location changed. Work title and description were preserved."
              : "Calendar synchronization recorded an external change.",
        actor,
        metadata: {
          hasGoogleEventId: true,
          externalChangeClass,
          recoveryState,
          oldStart: link.proposedStart,
          oldEnd: link.proposedEnd,
          newStart: nextStart,
          newEnd: nextEnd,
          titleChanged: drift.titleChanged,
          descriptionChanged: drift.descriptionChanged,
          locationChanged: drift.locationChanged,
        },
      });
      activityPublished = true;
    }
  }

  return {
    link: mapped,
    outcome,
    externalChangeClass,
    recoveryState,
    syncStatus,
    activityPublished,
    workProjectionUpdated,
    googleEventIdStable: mapped.googleEventId === googleEventId,
    message:
      recoveringNow
        ? "Calendar event confirmed. Synchronization restored."
        : outcome === "unchanged" || outcome === "metadata_only"
          ? "Calendar event matches the linked schedule."
          : outcome === "schedule_updated"
            ? "External schedule change detected and applied to the linked projection."
            : outcome === "descriptive_change"
              ? "External descriptive change detected. Work content was preserved."
              : "Calendar synchronization completed.",
    drift,
  };
}
