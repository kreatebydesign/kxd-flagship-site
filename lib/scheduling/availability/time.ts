/**
 * Phase 25D — Timezone-safe instant helpers for availability math.
 */

export function toMs(iso: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid ISO datetime: ${iso}`);
  }
  return ms;
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

export function zonedParts(
  ms: number,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
  second: number;
} {
  const d = new Date(ms);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayName = get("weekday");
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: map[weekdayName] ?? d.getUTCDay(),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/**
 * Convert a wall-clock local time in `timeZone` to a UTC instant (ms).
 * Uses iterative refinement against Intl — safe across DST transitions.
 */
export function zonedWallTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  // Initial guess: treat as UTC
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const p = zonedParts(guess, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = target - asUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return guess;
}

export function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

export function minutesBetween(startMs: number, endMs: number): number {
  return Math.max(0, Math.round((endMs - startMs) / 60_000));
}
