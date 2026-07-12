import type { WorkListItem } from "../types";
import { openWorkComposer } from "./events";
import { timeBudgetPresetFromHours } from "./time-budget";

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = String(iso).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

/** Open the Executive Work Composer prefilled for editing an existing item. */
export function openWorkComposerForEdit(work: WorkListItem): void {
  openWorkComposer({
    mode: "edit",
    workId: work.id,
    title: work.title,
    description: work.description ?? "",
    clientId: work.clientId,
    project: work.internalProject ?? "",
    dueDate: dateInputValue(work.dueDate),
    startDate: dateInputValue(work.startDate),
    plannedForDate: dateInputValue(work.plannedForDate),
    priority: work.priority,
    status: work.status,
    assignedToId: work.assignedToId,
    estimatedEffort: work.estimatedEffort,
    timeBudgetPresetId: timeBudgetPresetFromHours(work.estimatedEffort),
    tags: work.tags,
  });
}
