/**
 * Phase 25C — Calendar timezone resolution.
 */

import "server-only";

import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import { getGoogleCalendarMetadata } from "./calendars";

export async function resolveGoogleCalendarTimezone(
  calendarId?: string | null,
): Promise<string> {
  try {
    const meta = await getGoogleCalendarMetadata(calendarId);
    if (meta.timeZone?.trim()) return meta.timeZone.trim();
  } catch {
    /* fall through */
  }
  return KXD_BUSINESS_TIMEZONE;
}
