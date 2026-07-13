/**
 * Phase 30B — Central date/time contract foundation.
 *
 * Separates:
 * - instant timestamps (UTC ISO, point-in-time)
 * - date-only values (YYYY-MM-DD civil dates — never shift via timezone)
 * - user-facing date-times (instant + presentation timezone)
 * - relative time (derived; not stored)
 * - generated-at timestamps (instants)
 * - retrieval freshness (instants / durations)
 * - timezone preference (device/server settings — never server OS TZ as user TZ)
 *
 * Precedence:
 *   saved preference
 *   → desktop system timezone
 *   → browser timezone
 *   → configured business default
 *   → UTC
 *
 * Hydration: resolving browser timezone on the client can disagree with the
 * server-rendered string. Prefer passing an explicit timezone from the server
 * (cookie / saved preference) or defer formatting to the client after mount.
 *
 * Known migration debt (Executive Intelligence footer):
 * Surfaces that format `generatedAt` without an explicit display timezone
 * can disagree with the founder's wall clock. Migrate to
 * `resolvePresentationTimezone` + `formatInTimezone` later — do not change EI copy here.
 */

import { KXD_BUSINESS_TIMEZONE, isValidTimeZone } from "@/lib/platform/timezone";
import { runtimeFail, runtimeOk, type KxdRuntimeResult } from "./errors";

export type TimezoneSource =
  | "saved-preference"
  | "desktop-system"
  | "browser"
  | "configured-default"
  | "utc";

export type ResolvedTimezone = {
  timeZone: string;
  source: TimezoneSource;
};

export type ResolveTimezoneInput = {
  savedPreference?: string | null;
  desktopSystemTimezone?: string | null;
  browserTimezone?: string | null;
  configuredDefault?: string | null;
};

/** Civil calendar date — not an instant. */
export type DateOnly = string;

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pickValid(
  candidate: string | null | undefined,
  source: TimezoneSource,
): ResolvedTimezone | null {
  const value = candidate?.trim();
  if (value && isValidTimeZone(value)) {
    return { timeZone: value, source };
  }
  return null;
}

/**
 * Resolve presentation timezone with permanent precedence.
 * Invalid identifiers are skipped (rejected at that tier).
 */
export function resolvePresentationTimezone(
  input: ResolveTimezoneInput = {},
): ResolvedTimezone {
  return (
    pickValid(input.savedPreference, "saved-preference") ??
    pickValid(input.desktopSystemTimezone, "desktop-system") ??
    pickValid(input.browserTimezone, "browser") ??
    pickValid(
      input.configuredDefault ?? KXD_BUSINESS_TIMEZONE,
      "configured-default",
    ) ?? { timeZone: "UTC", source: "utc" }
  );
}

/**
 * Detect browser IANA timezone when available (client only).
 * Returns null on the server — do not invent a user timezone from server OS.
 */
export function detectBrowserTimezone(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && isValidTimeZone(tz) ? tz : null;
  } catch {
    return null;
  }
}

/** Store timestamps as UTC ISO strings. */
export function toUtcIso(date: Date = new Date()): string {
  return date.toISOString();
}

export function parseUtcIso(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatInTimezone(
  isoOrDate: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  const date =
    typeof isoOrDate === "string" ? parseUtcIso(isoOrDate) : isoOrDate;
  if (!date) return "";
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: tz }).format(
    date,
  );
}

/**
 * Validate a date-only civil value. Does not convert through zoned instants.
 */
export function parseDateOnly(value: string): KxdRuntimeResult<DateOnly> {
  const trimmed = value.trim();
  const match = DATE_ONLY_RE.exec(trimmed);
  if (!match) {
    return runtimeFail("invalid-input", "Expected YYYY-MM-DD date-only value.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Construct via UTC noon components to validate calendar without local shift.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return runtimeFail("invalid-input", "Date-only value is not a valid calendar day.");
  }
  return runtimeOk(trimmed);
}

/**
 * Format a date-only value for display without timezone day-shift.
 * Returns the civil components as a stable en-US medium date.
 */
export function formatDateOnly(value: DateOnly): KxdRuntimeResult<string> {
  const parsed = parseDateOnly(value);
  if (!parsed.ok) return parsed;
  const [y, m, d] = parsed.value.split("-").map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(probe);
  return runtimeOk(formatted);
}

/**
 * Documentation marker for EI footer migration — not a runtime fix.
 */
export const EXECUTIVE_INTELLIGENCE_FOOTER_TIMEZONE_DEBT = {
  id: "ei-footer-timezone",
  summary:
    "Executive Intelligence / brief footers must format generatedAt with resolvePresentationTimezone; do not trust server local time.",
  migrateTo: [
    "resolvePresentationTimezone",
    "formatInTimezone",
    "toUtcIso",
  ],
} as const;

export const DATETIME_HYDRATION_NOTE =
  "Browser timezone detection on the client can disagree with server render. Pass an explicit timezone or defer client formatting after mount.";
