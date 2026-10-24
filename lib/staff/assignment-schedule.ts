/**
 * Human-readable schedule labels for staff assignments (due + planned dates).
 * Does not invent dates — surfaces only what is stored on Work.
 */

import type { WorkListItem } from "@/lib/work/types";
import {
  isDueToday,
  isPlannedForToday,
  isWorkOverdue,
} from "@/lib/work/views";

function dateKey(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const key = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function formatCalendarDate(key: string): string {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type StaffAssignmentScheduleDisplay = {
  /** Primary schedule line (due posture or planned-only). */
  primary: string;
  /** Secondary line when both due and planned differ. */
  secondary: string | null;
  /** Short due chip for dense lists (null when no due date). */
  dueChip: string | null;
  /** Whether work is past due (requires dueDate). */
  isOverdue: boolean;
};

export function staffAssignmentScheduleDisplay(
  work: Pick<WorkListItem, "dueDate" | "plannedForDate" | "status">,
  now = new Date(),
): StaffAssignmentScheduleDisplay {
  const dueKey = dateKey(work.dueDate);
  const plannedKey = dateKey(work.plannedForDate);
  const overdue =
    Boolean(dueKey) &&
    work.status !== "completed" &&
    work.status !== "archived" &&
    isWorkOverdue(work as WorkListItem, now);

  let primary = "No due date";
  if (overdue) primary = "Overdue";
  else if (dueKey && isDueToday(work as WorkListItem, now)) primary = "Due today";
  else if (plannedKey && isPlannedForToday(work as WorkListItem, now) && !dueKey) {
    primary = "Planned today";
  } else if (dueKey) primary = `Due ${formatCalendarDate(dueKey)}`;
  else if (plannedKey) primary = `Planned ${formatCalendarDate(plannedKey)}`;

  let secondary: string | null = null;
  if (dueKey && plannedKey && dueKey !== plannedKey) {
    secondary = `Planned ${formatCalendarDate(plannedKey)}`;
  }

  const dueChip = dueKey ? formatCalendarDate(dueKey) : null;

  return { primary, secondary, dueChip, isOverdue: overdue };
}
