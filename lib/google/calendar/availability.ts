/**
 * Phase 25C — Free/busy reads (no event bodies, no writes).
 */

import "server-only";

import {
  CALENDAR_FREEBUSY_TTL_MS,
  getCalendarCache,
  setCalendarCache,
} from "./cache";
import { calendarApiJson } from "./client";
import { GoogleCalendarError } from "./errors";
import { resolveTargetCalendarId } from "./calendars";
import { resolveGoogleCalendarTimezone } from "./timezone";
import type { BusyBlock, FreeBusyQueryInput, FreeBusyResult } from "./types";
import { assertIsoRange } from "./validation";

interface GoogleFreeBusyResponse {
  timeMin?: string;
  timeMax?: string;
  calendars?: Record<
    string,
    {
      busy?: Array<{ start?: string; end?: string }>;
      errors?: Array<{ domain?: string; reason?: string }>;
    }
  >;
}

export async function queryGoogleCalendarFreeBusy(
  input: FreeBusyQueryInput,
  opts?: { bypassCache?: boolean },
): Promise<FreeBusyResult> {
  assertIsoRange(input.timeMin, input.timeMax);

  const calendarIds =
    input.calendarIds.length > 0
      ? input.calendarIds
      : [await resolveTargetCalendarId()];

  const timeZone =
    input.timeZone?.trim() ||
    (await resolveGoogleCalendarTimezone(calendarIds[0]));

  const cacheKey = `freebusy:${calendarIds.sort().join(",")}:${input.timeMin}:${input.timeMax}:${timeZone}`;
  if (!opts?.bypassCache) {
    const cached = getCalendarCache<FreeBusyResult>(cacheKey);
    if (cached) return cached;
  }

  const data = await calendarApiJson<GoogleFreeBusyResponse>("/freeBusy", {
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    timeZone,
    items: calendarIds.map((id) => ({ id })),
  });

  const calendars = calendarIds.map((calendarId) => {
    const entry = data.calendars?.[calendarId];
    const busy: BusyBlock[] = (entry?.busy ?? [])
      .map((b) => {
        if (!b.start || !b.end) return null;
        return {
          calendarId,
          start: b.start,
          end: b.end,
        } satisfies BusyBlock;
      })
      .filter((b): b is BusyBlock => b != null);

    const errors = (entry?.errors ?? []).map(
      (e) => `${e.domain ?? "google"}:${e.reason ?? "unknown"}`,
    );

    return { calendarId, busy, errors };
  });

  if (
    calendars.every((c) => c.errors.length > 0) &&
    calendars.every((c) => c.busy.length === 0)
  ) {
    throw new GoogleCalendarError(
      "authorization_failure",
      `Free/busy failed for all calendars: ${calendars
        .flatMap((c) => c.errors)
        .join("; ")}`,
      { details: { calendars } },
    );
  }

  const result: FreeBusyResult = {
    timeMin: data.timeMin ?? input.timeMin,
    timeMax: data.timeMax ?? input.timeMax,
    timeZone,
    calendars,
    queriedAt: new Date().toISOString(),
  };

  setCalendarCache(cacheKey, result, CALENDAR_FREEBUSY_TTL_MS);
  return result;
}
