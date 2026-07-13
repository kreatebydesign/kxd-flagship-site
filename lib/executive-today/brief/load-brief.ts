/**
 * Phase 27B — Load inputs for Executive Today brief.
 * Calendar observation is read-only and soft-fail.
 * Does not sync linked records, create events, or publish Activity.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getGoogleCalendarConnectionStatus } from "@/lib/google/calendar/validation";
import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import { getCalendarDayObserver } from "@/lib/scheduling/calendar-context";
import type { CalendarDayObserver } from "@/lib/scheduling/calendar-providers";
import { SCHEDULING_WORKING_HOURS } from "@/lib/scheduling/policy";
import {
  SCHEDULE_LINK_COLLECTION,
  type ScheduleExternalChangeClass,
  type ScheduleRecoveryState,
  type ScheduleSyncStatus,
} from "@/lib/scheduling/types";
import { WORK_COLLECTION, WORK_ENGINE_HOME } from "@/lib/work/constants";
import { composeExecutiveTodayBrief } from "./compose";
import { buildExecutiveDayBounds } from "./time-model";
import type {
  ExecutiveTodayBrief,
  ExecutiveTodayLinkedSchedule,
  ExecutiveTodayWorkRef,
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

export interface BuildExecutiveTodayBriefOptions {
  nowIso?: string;
  timeZone?: string;
  dayObserver?: CalendarDayObserver;
  /** Injected observation for tests — skips provider. */
  observedEvents?: ExecutiveTodayBrief extends never ? never : import("@/lib/google/calendar/types").ObservedCalendarEvent[];
  skipCalendar?: boolean;
  reviewWaitingCount?: number;
  briefingContext?: import("@/lib/intelligence/briefings/types").BriefingInputContext;
}

/**
 * Compose the Executive Today operating brief.
 * Safe when calendar is disconnected or fails.
 */
export async function buildExecutiveTodayBrief(
  opts: BuildExecutiveTodayBriefOptions = {},
): Promise<ExecutiveTodayBrief> {
  const timeZone = opts.timeZone || KXD_BUSINESS_TIMEZONE;
  const nowIso = opts.nowIso || new Date().toISOString();
  const bounds = buildExecutiveDayBounds({
    nowIso,
    timeZone,
    workStartHour: SCHEDULING_WORKING_HOURS.startHour,
    workEndHour: SCHEDULING_WORKING_HOURS.endHour,
  });

  const connection = getGoogleCalendarConnectionStatus();
  let calendarAvailable = connection.connected;
  let calendarObservedAt: string | null = null;
  let calendarFailureMessage: string | null = null;
  let observedEvents =
    opts.observedEvents ??
    ([] as import("@/lib/google/calendar/types").ObservedCalendarEvent[]);

  const payload = await getPayload({ config });

  const [linksResult, workResult] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: SCHEDULE_LINK_COLLECTION as any,
      where: {
        and: [
          {
            status: {
              in: ["scheduled", "sync_error", "reschedule_required"],
            },
          },
          {
            or: [
              {
                and: [
                  { proposedStart: { greater_than_equal: bounds.dayStartIso } },
                  { proposedStart: { less_than_equal: bounds.dayEndIso } },
                ],
              },
              {
                and: [
                  { proposedEnd: { greater_than_equal: bounds.dayStartIso } },
                  { proposedEnd: { less_than_equal: bounds.dayEndIso } },
                ],
              },
              {
                and: [
                  { proposedStart: { less_than_equal: bounds.dayStartIso } },
                  { proposedEnd: { greater_than_equal: bounds.dayEndIso } },
                ],
              },
            ],
          },
        ],
      },
      limit: 40,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      where: {
        or: [
          { plannedForDate: { equals: bounds.dateKey } },
          {
            and: [
              { scheduledStart: { greater_than_equal: bounds.dayStartIso } },
              { scheduledStart: { less_than_equal: bounds.dayEndIso } },
            ],
          },
          {
            and: [
              { dueDate: { less_than: bounds.dayStartIso } },
              {
                status: {
                  in: [
                    "new",
                    "planned",
                    "in-progress",
                    "blocked",
                    "waiting-on-client",
                    "waiting-on-kxd",
                    "review",
                  ],
                },
              },
            ],
          },
        ],
      },
      limit: 60,
      depth: 1,
      overrideAccess: true,
    }),
  ]);

  if (!opts.skipCalendar && opts.observedEvents == null && calendarAvailable) {
    try {
      const observer = opts.dayObserver ?? getCalendarDayObserver();
      const listed = await observer.listEventsInRange({
        timeMin: bounds.dayStartIso,
        timeMax: toExclusiveEnd(bounds.dayEndIso),
        maxResults: 50,
      });
      calendarObservedAt = listed.observedAt;
      if (listed.outcome === "ok") {
        observedEvents = listed.events;
      } else {
        calendarAvailable = false;
        calendarFailureMessage =
          listed.failure?.message ?? "Calendar observation failed.";
      }
    } catch (err) {
      calendarAvailable = false;
      calendarFailureMessage =
        err instanceof Error ? err.message : "Calendar observation failed.";
    }
  } else if (!calendarAvailable) {
    calendarFailureMessage = connection.connected
      ? null
      : "Google Calendar is not connected.";
  }

  const workById = new Map<number, AnyDoc>();
  for (const doc of workResult.docs as AnyDoc[]) {
    workById.set(Number(doc.id), doc);
  }

  // Batch-load Work for schedule links not already in the Work query
  const missingWorkIds = new Set<number>();
  for (const doc of linksResult.docs as AnyDoc[]) {
    const workId = relId(doc.work);
    if (workId != null && !workById.has(workId)) missingWorkIds.add(workId);
  }
  if (missingWorkIds.size > 0) {
    const extra = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      where: { id: { in: [...missingWorkIds] } },
      limit: missingWorkIds.size,
      depth: 1,
      overrideAccess: true,
    });
    for (const doc of extra.docs as AnyDoc[]) {
      workById.set(Number(doc.id), doc);
    }
  }

  const linkedSchedules: ExecutiveTodayLinkedSchedule[] = (
    linksResult.docs as AnyDoc[]
  ).map((doc) => {
    const workId = relId(doc.work) ?? 0;
    const work = workById.get(workId);
    const clientName =
      work?.client && typeof work.client === "object"
        ? String((work.client as AnyDoc).name ?? "") || null
        : null;
    return {
      linkId: Number(doc.id),
      workId,
      workTitle: work ? String(work.title ?? "Work") : "Work",
      workHref: `${WORK_ENGINE_HOME}/${workId}`,
      clientName,
      proposedStart: String(doc.proposedStart),
      proposedEnd: String(doc.proposedEnd),
      timezone: String(doc.timezone ?? timeZone),
      googleEventId: doc.googleEventId ? String(doc.googleEventId) : null,
      googleCalendarId: doc.googleCalendarId
        ? String(doc.googleCalendarId)
        : null,
      googleEventHtmlLink: doc.googleEventHtmlLink
        ? String(doc.googleEventHtmlLink)
        : null,
      syncStatus: (doc.syncStatus ?? "none") as ScheduleSyncStatus,
      recoveryState: (doc.recoveryState ?? "none") as ScheduleRecoveryState,
      externalChangeClass: (doc.externalChangeClass ??
        "none") as ScheduleExternalChangeClass,
      lastSyncAt: doc.lastSyncAt ? String(doc.lastSyncAt) : null,
      estimatedEffortHours:
        work?.estimatedEffort != null ? Number(work.estimatedEffort) : null,
      workPriority: work?.priority ? String(work.priority) : null,
      workDueDate: work?.dueDate ? String(work.dueDate) : null,
      workStatus: work?.status ? String(work.status) : null,
    };
  });

  const dayStartMs = Date.parse(bounds.dayStartIso);
  const workItems: ExecutiveTodayWorkRef[] = [...workById.values()].map(
    (doc) => {
      const id = Number(doc.id);
      const due = doc.dueDate ? String(doc.dueDate) : null;
      const dueMs = due ? Date.parse(due) : NaN;
      const clientName =
        doc.client && typeof doc.client === "object"
          ? String((doc.client as AnyDoc).name ?? "") || null
          : null;
      return {
        workId: id,
        title: String(doc.title ?? "Work"),
        href: `${WORK_ENGINE_HOME}/${id}`,
        clientName,
        priority: String(doc.priority ?? "normal"),
        status: String(doc.status ?? "inbox"),
        dueDate: due,
        plannedForDate: doc.plannedForDate ? String(doc.plannedForDate) : null,
        scheduledStart: doc.scheduledStart ? String(doc.scheduledStart) : null,
        scheduledEnd: doc.scheduledEnd ? String(doc.scheduledEnd) : null,
        schedulingStatus: String(doc.schedulingStatus ?? "none"),
        estimatedEffortHours:
          doc.estimatedEffort != null ? Number(doc.estimatedEffort) : null,
        overdue: Number.isFinite(dueMs) && dueMs < dayStartMs,
      };
    },
  );

  return composeExecutiveTodayBrief({
    nowIso,
    timeZone,
    workStartHour: SCHEDULING_WORKING_HOURS.startHour,
    workEndHour: SCHEDULING_WORKING_HOURS.endHour,
    calendarAvailable,
    calendarObservedAt,
    calendarFailureMessage,
    observedEvents,
    linkedSchedules,
    workItems,
    reviewWaitingCount: opts.reviewWaitingCount ?? 0,
    briefing: opts.briefingContext ?? null,
  });
}

function toExclusiveEnd(dayEndInclusiveIso: string): string {
  return new Date(Date.parse(dayEndInclusiveIso) + 1).toISOString();
}
