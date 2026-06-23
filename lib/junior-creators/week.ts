/** Monday 00:00 local — week boundary for junior creator reporting. */
export function getWeekStart(date = new Date()): Date {
  const now = new Date(date);
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

/** Week key = ISO date of Monday (e.g. 2026-06-16). */
export function getWeekKey(date = new Date()): string {
  return getWeekStart(date).toISOString().slice(0, 10);
}

export function getLeadWeekKey(createdAt: string | Date): string {
  return getWeekKey(new Date(createdAt));
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function formatHoursFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatEarningsCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
