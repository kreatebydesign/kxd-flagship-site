/**
 * Phase 26C / 27A — Google Calendar event create (write) + get (read).
 * Plain fetch against Calendar API v3 — no googleapis SDK.
 * Never expose Google client types to Scheduling.
 * Phase 27A does not update or delete events.
 */

import "server-only";

import { calendarApiJson, calendarApiRequest } from "./client";
import {
  GoogleCalendarError,
  isGoogleCalendarError,
} from "./errors";
import type {
  CalendarEventReadResult,
  CalendarEventSnapshot,
  CreateCalendarEventInput,
  CreatedCalendarEvent,
  GetCalendarEventInput,
} from "./types";
import { assertCalendarId, assertIsoRange } from "./validation";

interface GoogleEventResource {
  id?: string;
  etag?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  organizer?: { email?: string; displayName?: string };
}

function encodeCalendarPathId(calendarId: string): string {
  return encodeURIComponent(assertCalendarId(calendarId));
}

function encodeEventPathId(eventId: string): string {
  const id = eventId.trim();
  if (!id) {
    throw new GoogleCalendarError(
      "invalid_request",
      "Event id is required.",
    );
  }
  return encodeURIComponent(id);
}

function pickIso(part?: {
  dateTime?: string;
  date?: string;
}): string | null {
  if (!part) return null;
  if (typeof part.dateTime === "string" && part.dateTime.trim()) {
    return part.dateTime.trim();
  }
  if (typeof part.date === "string" && part.date.trim()) {
    return part.date.trim();
  }
  return null;
}

function normalizeGoogleEventResource(
  calendarId: string,
  raw: GoogleEventResource,
): CalendarEventSnapshot {
  const eventId = typeof raw.id === "string" ? raw.id.trim() : "";
  const status =
    typeof raw.status === "string" && raw.status.trim()
      ? raw.status.trim().toLowerCase()
      : null;
  const cancelled = status === "cancelled";
  const timezone =
    (typeof raw.start?.timeZone === "string" && raw.start.timeZone.trim()
      ? raw.start.timeZone.trim()
      : null) ??
    (typeof raw.end?.timeZone === "string" && raw.end.timeZone.trim()
      ? raw.end.timeZone.trim()
      : null);

  return {
    eventId,
    calendarId,
    title:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : null,
    description:
      typeof raw.description === "string" ? raw.description : null,
    location:
      typeof raw.location === "string" && raw.location.trim()
        ? raw.location.trim()
        : null,
    start: pickIso(raw.start),
    end: pickIso(raw.end),
    timezone,
    status,
    htmlLink:
      typeof raw.htmlLink === "string" && raw.htmlLink.trim()
        ? raw.htmlLink.trim()
        : null,
    etag:
      typeof raw.etag === "string" && raw.etag.trim()
        ? raw.etag.trim()
        : null,
    updatedAt:
      typeof raw.updated === "string" && raw.updated.trim()
        ? raw.updated.trim()
        : null,
    createdAt:
      typeof raw.created === "string" && raw.created.trim()
        ? raw.created.trim()
        : null,
    organizerEmail:
      typeof raw.organizer?.email === "string" && raw.organizer.email.trim()
        ? raw.organizer.email.trim()
        : null,
    cancelled,
    exists: Boolean(eventId) && !cancelled,
  };
}

function failureFromError(err: unknown): CalendarEventReadResult {
  if (isGoogleCalendarError(err)) {
    if (err.code === "calendar_not_found" || err.status === 404) {
      return {
        outcome: "missing",
        event: null,
        failure: {
          classification: "not_found",
          message: err.message,
          retryable: false,
          providerCode: err.code,
        },
      };
    }
    if (
      err.code === "authorization_failure" ||
      err.code === "authentication_failure"
    ) {
      return {
        outcome: "failure",
        event: null,
        failure: {
          classification:
            err.code === "authentication_failure"
              ? "authentication_failure"
              : "authorization_failure",
          message: err.message,
          retryable: false,
          providerCode: err.code,
        },
      };
    }
    if (
      err.code === "network_failure" ||
      err.code === "rate_limit" ||
      err.code === "temporary_outage"
    ) {
      return {
        outcome: "failure",
        event: null,
        failure: {
          classification:
            err.code === "temporary_outage" || err.code === "rate_limit"
              ? "provider_unavailable"
              : "transient_error",
          message: err.message,
          retryable: true,
          providerCode: err.code,
        },
      };
    }
    if (err.code === "invalid_request" || err.code === "invalid_config") {
      return {
        outcome: "failure",
        event: null,
        failure: {
          classification: "invalid_request",
          message: err.message,
          retryable: false,
          providerCode: err.code,
        },
      };
    }
    return {
      outcome: "failure",
      event: null,
      failure: {
        classification: "unknown",
        message: err.message,
        retryable: err.retryable,
        providerCode: err.code,
      },
    };
  }

  return {
    outcome: "failure",
    event: null,
    failure: {
      classification: "unknown",
      message: err instanceof Error ? err.message : "Unknown calendar read error.",
      retryable: true,
    },
  };
}

/**
 * Fetch a single event by id. Read-only — never creates or mutates.
 */
export async function getCalendarEvent(
  input: GetCalendarEventInput,
): Promise<CalendarEventReadResult> {
  try {
    const calendarId = assertCalendarId(
      typeof input.calendarId === "string" ? input.calendarId : "",
    );
    const eventId = typeof input.eventId === "string" ? input.eventId.trim() : "";
    if (!eventId) {
      return {
        outcome: "failure",
        event: null,
        failure: {
          classification: "invalid_request",
          message: "Event id is required.",
          retryable: false,
        },
      };
    }

    const raw = await calendarApiRequest<GoogleEventResource>(
      `/calendars/${encodeCalendarPathId(calendarId)}/events/${encodeEventPathId(eventId)}`,
      { method: "GET", timeoutMs: 15_000 },
    );

    const event = normalizeGoogleEventResource(calendarId, raw);
    if (!event.eventId) {
      return {
        outcome: "failure",
        event: null,
        failure: {
          classification: "unknown",
          message: "Google Calendar get returned no event id.",
          retryable: false,
        },
      };
    }

    return { outcome: "found", event, failure: null };
  } catch (err) {
    return failureFromError(err);
  }
}

/**
 * Create a single event on Matt’s calendar.
 * Does not update or delete events.
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CreatedCalendarEvent> {
  const calendarId = assertCalendarId(
    typeof input.calendarId === "string" ? input.calendarId : "",
  );
  const title = input.title?.trim();
  if (!title) {
    throw new GoogleCalendarError(
      "invalid_request",
      "Event title is required.",
    );
  }

  assertIsoRange(input.start, input.end);

  const timezone = input.timezone?.trim();
  if (!timezone) {
    throw new GoogleCalendarError(
      "invalid_request",
      "Event timezone is required.",
    );
  }

  const attendees = (input.attendees ?? [])
    .map((a) => ({ email: a.email.trim() }))
    .filter((a) => a.email.length > 0);

  const body: Record<string, unknown> = {
    summary: title,
    description: input.description?.trim() || undefined,
    start: {
      dateTime: input.start,
      timeZone: timezone,
    },
    end: {
      dateTime: input.end,
      timeZone: timezone,
    },
  };

  if (attendees.length > 0) {
    body.attendees = attendees;
  }

  const created = await calendarApiJson<GoogleEventResource>(
    `/calendars/${encodeCalendarPathId(calendarId)}/events`,
    body,
    { method: "POST", timeoutMs: 20_000 },
  );

  const googleEventId =
    typeof created.id === "string" ? created.id.trim() : "";
  if (!googleEventId) {
    throw new GoogleCalendarError(
      "malformed_response",
      "Google Calendar create returned no event id.",
      { details: { calendarId } },
    );
  }

  return {
    googleEventId,
    htmlLink:
      typeof created.htmlLink === "string" && created.htmlLink.trim()
        ? created.htmlLink.trim()
        : null,
    etag:
      typeof created.etag === "string" && created.etag.trim()
        ? created.etag.trim()
        : null,
    calendarId,
    createdAt:
      typeof created.created === "string" && created.created.trim()
        ? created.created.trim()
        : new Date().toISOString(),
  };
}
