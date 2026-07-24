/**
 * Deterministic staff daily-plan prioritization.
 * Business rules first — Intelligence may explain, never invent rank.
 */

import type { WorkListItem } from "@/lib/work/types";
import { PRIORITY_RANK } from "@/lib/work/constants";
import {
  isDueToday,
  isPlannedForToday,
  isStartToday,
  isWorkOverdue,
} from "@/lib/work/views";
import { toLocalDateKey, addLocalDays, parseDateKey } from "@/lib/work/planning/dates";

/** Lower band = earlier in the day. */
export type StaffPriorityBand =
  | 1 // Urgent overdue
  | 2 // Matt-marked priority (critical/high)
  | 3 // Due today
  | 4 // Returned for correction
  | 5 // Client-blocking
  | 6 // Scheduled / planned today
  | 7 // Upcoming deadlines
  | 8 // Required training (non-work)
  | 9 // Safe preparation
  | 10; // Optional / later

export function isWaitingOnMatt(work: WorkListItem): boolean {
  return (
    work.status === "review" ||
    work.status === "waiting-on-kxd" ||
    work.schedulingStatus === "proposed"
  );
}

export function isReturnedWork(work: WorkListItem): boolean {
  const tags = work.tags.map((t) => t.toLowerCase());
  if (tags.includes("returned") || tags.includes("returned-by-matt")) return true;
  if (work.notes && /\[returned by matt\]/i.test(work.notes)) return true;
  return work.activityHistory.some(
    (entry) =>
      entry.action === "returned" ||
      /returned by matt/i.test(entry.detail ?? "") ||
      /returned by matt/i.test(entry.action),
  );
}

export function isClientBlocking(work: WorkListItem): boolean {
  if (work.category === "onboarding") return true;
  if (work.source === "website-review") return true;
  if (work.tags.some((t) => /client-blocking|blocks-client/i.test(t))) return true;
  return false;
}

export function needsInformation(work: WorkListItem): boolean {
  if (work.tags.some((t) => /need[s]?-info|needs-information/i.test(t))) return true;
  if (!work.summary?.trim() && !work.description?.trim()) return true;
  return false;
}

export function requiresMattApproval(work: WorkListItem): boolean {
  if (isWaitingOnMatt(work)) return true;
  if (work.priority === "critical") return true;
  if (work.tags.some((t) => /requires-approval|needs-matt/i.test(t))) return true;
  if (
    work.category === "operations" &&
    /billing|invoice|payment|refund|access|publish/i.test(
      `${work.title} ${work.summary ?? ""}`,
    )
  ) {
    return true;
  }
  return false;
}

export function isUpcomingWithinDays(
  work: WorkListItem,
  days: number,
  now = new Date(),
): boolean {
  if (!work.dueDate) return false;
  if (isWorkOverdue(work, now) || isDueToday(work, now)) return false;
  const due = parseDateKey(work.dueDate);
  if (!due) return false;
  const end = addLocalDays(now, days);
  end.setHours(23, 59, 59, 999);
  return due.getTime() > now.getTime() && due.getTime() <= end.getTime();
}

/**
 * Classify open, actionable work into a priority band.
 * Waiting-on-Matt items should be filtered out before calling this.
 */
export function classifyActionableBand(
  work: WorkListItem,
  now = new Date(),
): StaffPriorityBand {
  if (isWorkOverdue(work, now)) return 1;
  if (work.priority === "critical" || work.priority === "high") return 2;
  if (isDueToday(work, now)) return 3;
  if (isReturnedWork(work)) return 4;
  if (isClientBlocking(work)) return 5;
  if (isPlannedForToday(work, now) || isStartToday(work, now)) return 6;
  if (isUpcomingWithinDays(work, 3, now)) return 7;
  if (work.status === "in-progress") return 9;
  return 9;
}

export function sortActionableWork(
  items: WorkListItem[],
  now = new Date(),
): WorkListItem[] {
  return [...items].sort((a, b) => {
    const bandA = classifyActionableBand(a, now);
    const bandB = classifyActionableBand(b, now);
    if (bandA !== bandB) return bandA - bandB;
    const pa = PRIORITY_RANK[a.priority] ?? 9;
    const pb = PRIORITY_RANK[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = a.dueDate
      ? new Date(a.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    const db = b.dueDate
      ? new Date(b.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });
}

export function bandLabel(band: StaffPriorityBand): string {
  switch (band) {
    case 1:
      return "Urgent overdue";
    case 2:
      return "Matt marked priority";
    case 3:
      return "Due today";
    case 4:
      return "Returned for correction";
    case 5:
      return "Client-blocking";
    case 6:
      return "Scheduled for today";
    case 7:
      return "Upcoming deadline";
    case 8:
      return "Required training";
    case 9:
      return "Safe preparation";
    default:
      return "Later";
  }
}

export function todayDateLabel(now = new Date()): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export { toLocalDateKey };
