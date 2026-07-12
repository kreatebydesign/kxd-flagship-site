import type { WorkComposerDraft, WorkComposerOpenOptions } from "./types";
import {
  customPartsFromHours,
  hoursFromTimeBudgetPreset,
  resolveTimeBudgetHours,
  timeBudgetPresetFromHours,
} from "./time-budget";

/** Local calendar date as YYYY-MM-DD. */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createEmptyComposerDraft(
  today = localDateString(),
  assignedToId: number | null = null,
): WorkComposerDraft {
  return {
    mode: "create",
    workId: null,
    title: "",
    description: "",
    clientId: null,
    project: "",
    dueDate: "",
    priority: "normal",
    status: "new",
    assignedToId,
    timeBudgetPresetId: "",
    customHours: "",
    customMinutes: "",
    estimatedEffort: null,
    tags: "",
    startDate: today,
    plannedForDate: "",
  };
}

export function applyComposerPrefill(
  draft: WorkComposerDraft,
  options?: WorkComposerOpenOptions | null,
): WorkComposerDraft {
  if (!options) return draft;

  const mode = options.mode ?? draft.mode;
  const workId = options.workId ?? draft.workId;

  let timeBudgetPresetId = draft.timeBudgetPresetId;
  let estimatedEffort = draft.estimatedEffort;
  let customHours = draft.customHours;
  let customMinutes = draft.customMinutes;

  if (options.timeBudgetPresetId !== undefined) {
    timeBudgetPresetId = options.timeBudgetPresetId;
    estimatedEffort = hoursFromTimeBudgetPreset(options.timeBudgetPresetId);
  } else if (options.estimatedEffort !== undefined) {
    estimatedEffort = options.estimatedEffort;
    timeBudgetPresetId = timeBudgetPresetFromHours(options.estimatedEffort);
  }

  if (timeBudgetPresetId === "custom" && estimatedEffort != null) {
    const parts = customPartsFromHours(estimatedEffort);
    customHours = parts.hours;
    customMinutes = parts.minutes;
  }

  const next: WorkComposerDraft = {
    ...draft,
    mode,
    workId: mode === "edit" ? workId : null,
    title: options.title?.trim() ? options.title : draft.title,
    description: options.description?.trim() ? options.description : draft.description,
    clientId: options.clientId !== undefined ? options.clientId : draft.clientId,
    project: options.project?.trim() ? options.project : draft.project,
    dueDate: options.dueDate ?? draft.dueDate,
    startDate: options.startDate ?? draft.startDate,
    plannedForDate: options.plannedForDate ?? draft.plannedForDate,
    priority: options.priority ?? draft.priority,
    status: options.status ?? draft.status,
    assignedToId:
      options.assignedToId !== undefined ? options.assignedToId : draft.assignedToId,
    timeBudgetPresetId,
    customHours,
    customMinutes,
    estimatedEffort,
    tags: options.tags?.length ? options.tags.join(", ") : draft.tags,
  };

  next.estimatedEffort = resolveTimeBudgetHours(next);
  return next;
}

export function parseComposerTags(raw: string): string[] {
  return raw
    .split(/[,#]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Edit mode: expand More details when any secondary field already has a value.
 * Create mode stays collapsed so capture stays fast.
 */
export function shouldExpandComposerMoreDetails(draft: WorkComposerDraft): boolean {
  if (draft.mode !== "edit") return false;
  return (
    Boolean(draft.project.trim()) ||
    Boolean(draft.tags.trim()) ||
    Boolean(draft.timeBudgetPresetId) ||
    Boolean(draft.plannedForDate) ||
    Boolean(draft.startDate) ||
    draft.assignedToId != null ||
    draft.priority !== "normal" ||
    draft.status !== "new"
  );
}
