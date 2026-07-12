/**
 * Phase 25C — Calendar list / metadata / ownership (read-only).
 */

import "server-only";

import {
  CALENDAR_METADATA_TTL_MS,
  getCalendarCache,
  setCalendarCache,
} from "./cache";
import { calendarApiRequest } from "./client";
import { GoogleCalendarError } from "./errors";
import type { CalendarListItem, CalendarMetadata } from "./types";
import { assertCalendarId, loadGoogleCalendarOAuthConfig } from "./validation";

interface GoogleCalendarListResponse {
  items?: Array<{
    id?: string;
    summary?: string;
    description?: string;
    primary?: boolean;
    accessRole?: string;
    timeZone?: string;
    selected?: boolean;
    backgroundColor?: string;
  }>;
}

interface GoogleCalendarResource {
  id?: string;
  summary?: string;
  description?: string;
  timeZone?: string;
}

function mapListItem(
  row: NonNullable<GoogleCalendarListResponse["items"]>[number],
): CalendarListItem | null {
  if (!row.id) return null;
  return {
    id: row.id,
    summary: row.summary ?? row.id,
    description: row.description ?? null,
    primary: Boolean(row.primary),
    accessRole: row.accessRole ?? "unknown",
    timeZone: row.timeZone ?? null,
    selected: row.selected !== false,
    backgroundColor: row.backgroundColor ?? null,
  };
}

export async function listGoogleCalendars(opts?: {
  bypassCache?: boolean;
}): Promise<CalendarListItem[]> {
  const cacheKey = "calendars:list";
  if (!opts?.bypassCache) {
    const cached = getCalendarCache<CalendarListItem[]>(cacheKey);
    if (cached) return cached;
  }

  const data = await calendarApiRequest<GoogleCalendarListResponse>(
    "/users/me/calendarList?maxResults=250",
  );
  const items = (data.items ?? [])
    .map(mapListItem)
    .filter((row): row is CalendarListItem => row != null);

  setCalendarCache(cacheKey, items, CALENDAR_METADATA_TTL_MS);
  return items;
}

export async function getPrimaryGoogleCalendar(): Promise<CalendarListItem> {
  const calendars = await listGoogleCalendars();
  const primary = calendars.find((c) => c.primary);
  if (primary) return primary;
  if (calendars[0]) return calendars[0];
  throw new GoogleCalendarError(
    "calendar_not_found",
    "No calendars found for the connected Google account.",
  );
}

export async function resolveTargetCalendarId(
  calendarId?: string | null,
): Promise<string> {
  if (calendarId?.trim()) return assertCalendarId(calendarId);
  try {
    const config = loadGoogleCalendarOAuthConfig({ requireRefreshToken: false });
    if (config.preferredCalendarId) {
      return assertCalendarId(config.preferredCalendarId);
    }
  } catch {
    /* preferred id optional */
  }
  const primary = await getPrimaryGoogleCalendar();
  return primary.id;
}

export async function getGoogleCalendarMetadata(
  calendarId?: string | null,
  opts?: { bypassCache?: boolean },
): Promise<CalendarMetadata> {
  const id = await resolveTargetCalendarId(calendarId);
  const cacheKey = `calendars:meta:${id}`;
  if (!opts?.bypassCache) {
    const cached = getCalendarCache<CalendarMetadata>(cacheKey);
    if (cached) return cached;
  }

  const list = await listGoogleCalendars(opts);
  const fromList = list.find((c) => c.id === id);

  let resource: GoogleCalendarResource;
  try {
    resource = await calendarApiRequest<GoogleCalendarResource>(
      `/calendars/${encodeURIComponent(id)}`,
    );
  } catch (err) {
    if (fromList) {
      const meta: CalendarMetadata = {
        id: fromList.id,
        summary: fromList.summary,
        description: fromList.description,
        timeZone: fromList.timeZone || "America/Los_Angeles",
        accessRole: fromList.accessRole,
        primary: fromList.primary,
      };
      setCalendarCache(cacheKey, meta, CALENDAR_METADATA_TTL_MS);
      return meta;
    }
    throw err;
  }

  const meta: CalendarMetadata = {
    id: resource.id ?? id,
    summary: resource.summary ?? fromList?.summary ?? id,
    description: resource.description ?? fromList?.description ?? null,
    timeZone:
      resource.timeZone ||
      fromList?.timeZone ||
      "America/Los_Angeles",
    accessRole: fromList?.accessRole ?? null,
    primary: fromList?.primary ?? false,
  };
  setCalendarCache(cacheKey, meta, CALENDAR_METADATA_TTL_MS);
  return meta;
}

/**
 * Validate that the connected account can read the target calendar.
 * Owner / writer / reader roles are accepted for read foundation.
 */
export async function validateCalendarOwnership(
  calendarId?: string | null,
): Promise<{
  ok: true;
  calendarId: string;
  accessRole: string;
  primary: boolean;
}> {
  const id = await resolveTargetCalendarId(calendarId);
  const list = await listGoogleCalendars();
  const entry = list.find((c) => c.id === id);
  if (!entry) {
    throw new GoogleCalendarError(
      "calendar_not_found",
      `Calendar ${id} is not visible to the connected Google account.`,
      { details: { calendarId: id } },
    );
  }

  const allowed = new Set([
    "owner",
    "writer",
    "reader",
    "freeBusyReader",
  ]);
  if (!allowed.has(entry.accessRole)) {
    throw new GoogleCalendarError(
      "unsupported_calendar",
      `Calendar access role "${entry.accessRole}" is not supported for scheduling reads.`,
      { details: { calendarId: id, accessRole: entry.accessRole } },
    );
  }

  return {
    ok: true,
    calendarId: id,
    accessRole: entry.accessRole,
    primary: entry.primary,
  };
}
