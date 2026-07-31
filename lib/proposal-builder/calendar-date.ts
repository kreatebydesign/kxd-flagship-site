/**
 * Calendar-date helpers for proposal builder.
 * Expiration and proposal dates are calendar days, not timezone-shifted instants.
 */

const STUDIO_TIME_ZONE = "America/Los_Angeles";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** YYYY-MM-DD extracted in the studio timezone (avoids UTC day-boundary drift). */
export function toProposalCalendarDateString(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return m?.[1] ?? "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) return "";
  return `${y}-${m}-${day}`;
}

/** Long English label, e.g. August 29, 2026 — calendar date, not UTC-shifted. */
export function formatProposalCalendarDate(
  value: string | null | undefined,
): string {
  const ymd = toProposalCalendarDateString(value);
  if (!ymd) return "—";
  const [ys, ms, ds] = ymd.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d || m < 1 || m > 12) return "—";
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * Persist a date-input value (YYYY-MM-DD) as a noon-UTC instant so the calendar
 * day is stable across US timezones when re-read.
 */
export function calendarDateToStoredInstant(ymd: string | null | undefined): string | null {
  const raw = String(ymd ?? "").trim();
  if (!raw) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : toProposalCalendarDateString(raw);
  if (!dateOnly) return null;
  return `${dateOnly}T12:00:00.000Z`;
}
