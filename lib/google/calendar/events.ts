/**
 * Phase 26C — Google Calendar event creation (write).
 * Plain fetch against Calendar API v3 — no googleapis SDK.
 * Never expose Google client types to Scheduling.
 */

import "server-only";

import { calendarApiJson } from "./client";
import { GoogleCalendarError } from "./errors";
import type { CreateCalendarEventInput, CreatedCalendarEvent } from "./types";
import { assertCalendarId, assertIsoRange } from "./validation";

interface GoogleEventResource {
  id?: string;
  etag?: string;
  htmlLink?: string;
  created?: string;
  status?: string;
}

function encodeCalendarPathId(calendarId: string): string {
  return encodeURIComponent(assertCalendarId(calendarId));
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
