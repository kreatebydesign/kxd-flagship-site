/**
 * Phase 24A — Daily planning mutations.
 * plannedForDate never touches dueDate.
 */

import "server-only";

import { getWorkPool } from "../engine";
import { updateWorkItem } from "../services";
import type { WorkListItem } from "../types";
import {
  filterUpcomingWork,
  isPlannedForDate,
  sortWorkByDueDateAsc,
} from "../views";
import { addLocalDays, toLocalDateKey } from "./dates";

function normalizePlanDate(date: string | Date): string {
  if (typeof date === "string") {
    const key = date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      throw new Error("plannedForDate must be YYYY-MM-DD.");
    }
    return key;
  }
  return toLocalDateKey(date);
}

/**
 * Place work on a day for execution. Does not change dueDate.
 */
export async function planWorkForDate(
  workId: number,
  date: string | Date,
  actorEmail?: string,
): Promise<WorkListItem> {
  const plannedForDate = normalizePlanDate(date);
  return updateWorkItem({
    workId,
    plannedForDate,
    actorEmail,
  });
}

export async function removeWorkFromPlan(
  workId: number,
  actorEmail?: string,
): Promise<WorkListItem> {
  return updateWorkItem({
    workId,
    plannedForDate: null,
    actorEmail,
  });
}

export async function planWorkForToday(
  workId: number,
  actorEmail?: string,
): Promise<WorkListItem> {
  return planWorkForDate(workId, new Date(), actorEmail);
}

export async function planWorkForTomorrow(
  workId: number,
  actorEmail?: string,
): Promise<WorkListItem> {
  return planWorkForDate(workId, addLocalDays(new Date(), 1), actorEmail);
}

/** Work intentionally planned for today (plannedForDate), open only. */
export async function getTodayPlan(): Promise<WorkListItem[]> {
  const pool = await getWorkPool();
  const today = new Date();
  return sortWorkByDueDateAsc(
    pool.filter(
      (item) =>
        item.status !== "archived" &&
        item.status !== "completed" &&
        isPlannedForDate(item, today),
    ),
  );
}

/** Open work with a future plannedForDate or upcoming due dates. */
export async function getUpcomingPlan(days = 14): Promise<WorkListItem[]> {
  const pool = await getWorkPool();
  const now = new Date();
  const end = addLocalDays(now, days);
  end.setHours(23, 59, 59, 999);

  const planned = pool.filter((item) => {
    if (item.status === "archived" || item.status === "completed") return false;
    if (!item.plannedForDate) return false;
    const key = item.plannedForDate.slice(0, 10);
    const plannedDate = new Date(`${key}T12:00:00`);
    if (Number.isNaN(plannedDate.getTime())) return false;
    const todayKey = toLocalDateKey(now);
    return key > todayKey && plannedDate.getTime() <= end.getTime();
  });

  const dueUpcoming = filterUpcomingWork(pool, days);
  const seen = new Set(planned.map((p) => p.id));
  const merged = [...planned, ...dueUpcoming.filter((d) => !seen.has(d.id))];
  return sortWorkByDueDateAsc(merged);
}
