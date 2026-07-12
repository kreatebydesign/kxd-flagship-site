/**
 * Phase 27B — Correlate observed calendar events to WorkScheduleLinks by provider IDs.
 * Never correlate by title alone. Never create Work from external events.
 */

import type { ObservedCalendarEvent } from "@/lib/google/calendar/types";
import type {
  CommitmentCorrelation,
  ExecutiveTodayLinkedSchedule,
} from "./types";

export interface CorrelatedCommitment {
  correlation: CommitmentCorrelation;
  event: ObservedCalendarEvent | null;
  link: ExecutiveTodayLinkedSchedule | null;
  eventId: string | null;
  calendarId: string | null;
}

export function correlateDayCommitments(input: {
  events: ObservedCalendarEvent[];
  links: ExecutiveTodayLinkedSchedule[];
}): CorrelatedCommitment[] {
  const byEventId = new Map<string, ObservedCalendarEvent>();
  const eventIdCounts = new Map<string, number>();

  for (const event of input.events) {
    const id = event.eventId.trim();
    if (!id) continue;
    eventIdCounts.set(id, (eventIdCounts.get(id) ?? 0) + 1);
    byEventId.set(id, event);
  }

  const results: CorrelatedCommitment[] = [];
  const matchedEventIds = new Set<string>();

  for (const link of input.links) {
    const eventId = (link.googleEventId ?? "").trim();
    if (!eventId) {
      results.push({
        correlation: "kxd_missing_from_calendar",
        event: null,
        link,
        eventId: null,
        calendarId: link.googleCalendarId,
      });
      continue;
    }

    const event = byEventId.get(eventId) ?? null;
    matchedEventIds.add(eventId);

    if ((eventIdCounts.get(eventId) ?? 0) > 1) {
      results.push({
        correlation: "duplicate_anomaly",
        event,
        link,
        eventId,
        calendarId: link.googleCalendarId,
      });
      continue;
    }

    if (!event) {
      const recovery =
        link.recoveryState === "missing_remote" ||
        link.recoveryState === "cancelled_remote" ||
        link.syncStatus === "deleted_remotely" ||
        link.syncStatus === "error";
      results.push({
        correlation: recovery ? "linked_recovery" : "kxd_missing_from_calendar",
        event: null,
        link,
        eventId,
        calendarId: link.googleCalendarId,
      });
      continue;
    }

    if (
      link.recoveryState === "missing_remote" ||
      link.recoveryState === "cancelled_remote" ||
      link.syncStatus === "deleted_remotely" ||
      link.externalChangeClass === "cancelled" ||
      link.externalChangeClass === "missing"
    ) {
      results.push({
        correlation: "linked_recovery",
        event,
        link,
        eventId,
        calendarId: link.googleCalendarId,
      });
      continue;
    }

    if (
      link.syncStatus === "stale" ||
      link.externalChangeClass === "schedule_impacting" ||
      link.externalChangeClass === "descriptive" ||
      link.recoveryState === "review_required"
    ) {
      results.push({
        correlation: "linked_drift",
        event,
        link,
        eventId,
        calendarId: link.googleCalendarId,
      });
      continue;
    }

    results.push({
      correlation: "linked_healthy",
      event,
      link,
      eventId,
      calendarId: link.googleCalendarId,
    });
  }

  for (const event of input.events) {
    const id = event.eventId.trim();
    if (!id || matchedEventIds.has(id)) continue;
    results.push({
      correlation: "external_unlinked",
      event,
      link: null,
      eventId: id,
      calendarId: event.calendarId,
    });
  }

  return results;
}
