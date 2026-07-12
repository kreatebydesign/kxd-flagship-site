/**
 * Local calendar-day helpers for Work Planning.
 * Client-safe.
 */

/** YYYY-MM-DD in local timezone. */
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseDateKey(value: string | null | undefined): Date | null {
  if (!value) return null;
  const key = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateKeyEquals(
  iso: string | null | undefined,
  day: Date = new Date(),
): boolean {
  if (!iso) return false;
  const parsed = parseDateKey(iso);
  if (!parsed) return false;
  return isSameLocalDay(parsed, day);
}
