/**
 * Structured assignment deliverables — definition (operator) + completion (assignee).
 * Stored on Work.metadata without collection migration.
 */

export const STAFF_ASSIGNMENT_DELIVERABLES_KEY = "staffAssignmentDeliverables";
export const STAFF_DELIVERABLE_PROGRESS_KEY = "staffDeliverableProgress";

const MAX_DELIVERABLES = 40;
const MAX_TITLE_LEN = 200;
const MAX_INSTRUCTIONS_LEN = 2000;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export interface StaffAssignmentDeliverableDef {
  id: string;
  title: string;
  instructions: string | null;
  required: boolean;
}

export interface StaffAssignmentDeliverablesDefinition {
  v: 1;
  items: StaffAssignmentDeliverableDef[];
  updatedAt: string;
  updatedBy?: string | null;
}

export interface StaffDeliverableCompletionRecord {
  completedAt: string;
}

export interface StaffDeliverableProgressState {
  v: 1;
  assigneeUserId: number;
  completed: Record<string, StaffDeliverableCompletionRecord>;
  updatedAt: string;
}

export interface StaffDeliverableView {
  id: string;
  title: string;
  instructions: string | null;
  required: boolean;
  completed: boolean;
  completedAt: string | null;
}

export interface StaffDeliverableProgressSummary {
  total: number;
  completed: number;
  requiredTotal: number;
  requiredCompleted: number;
  allRequiredComplete: boolean;
}

export function createDeliverableId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function parseDeliverablesDefinition(
  metadata: Record<string, unknown> | null | undefined,
): StaffAssignmentDeliverablesDefinition | null {
  if (!metadata) return null;
  const block = metadata[STAFF_ASSIGNMENT_DELIVERABLES_KEY];
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const def = block as StaffAssignmentDeliverablesDefinition;
  if (def.v !== 1 || !Array.isArray(def.items)) return null;
  const items = def.items
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as StaffAssignmentDeliverableDef).id === "string" &&
        typeof (item as StaffAssignmentDeliverableDef).title === "string",
    )
    .map((item) => ({
      id: String((item as StaffAssignmentDeliverableDef).id),
      title: String((item as StaffAssignmentDeliverableDef).title),
      instructions:
        (item as StaffAssignmentDeliverableDef).instructions != null
          ? String((item as StaffAssignmentDeliverableDef).instructions)
          : null,
      required: Boolean((item as StaffAssignmentDeliverableDef).required),
    }));
  return {
    v: 1,
    items,
    updatedAt: typeof def.updatedAt === "string" ? def.updatedAt : new Date().toISOString(),
    updatedBy: def.updatedBy != null ? String(def.updatedBy) : null,
  };
}

export function parseDeliverableProgress(
  metadata: Record<string, unknown> | null | undefined,
  assigneeUserId: number,
): StaffDeliverableProgressState | null {
  if (!metadata) return null;
  const block = metadata[STAFF_DELIVERABLE_PROGRESS_KEY];
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const state = block as StaffDeliverableProgressState;
  if (state.v !== 1 || state.assigneeUserId !== assigneeUserId) return null;
  if (!state.completed || typeof state.completed !== "object") return null;
  return state;
}

export function sanitizeDeliverablesInput(
  input: unknown,
): StaffAssignmentDeliverableDef[] | { error: string } {
  if (!Array.isArray(input)) return { error: "Deliverables must be an array." };
  if (input.length > MAX_DELIVERABLES) {
    return { error: `At most ${MAX_DELIVERABLES} deliverables allowed.` };
  }
  const seen = new Set<string>();
  const items: StaffAssignmentDeliverableDef[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") return { error: "Invalid deliverable row." };
    const raw = row as Record<string, unknown>;
    const id = String(raw.id ?? "").trim();
    const title = String(raw.title ?? "").trim();
    if (!id || !ID_PATTERN.test(id)) {
      return { error: "Each deliverable needs a stable id." };
    }
    if (seen.has(id)) return { error: "Duplicate deliverable id." };
    seen.add(id);
    if (!title) return { error: "Each deliverable needs a title." };
    if (title.length > MAX_TITLE_LEN) {
      return { error: `Deliverable title must be under ${MAX_TITLE_LEN} characters.` };
    }
    let instructions: string | null = null;
    if (raw.instructions != null && String(raw.instructions).trim()) {
      instructions = String(raw.instructions).trim();
      if (instructions.length > MAX_INSTRUCTIONS_LEN) {
        return { error: `Instructions must be under ${MAX_INSTRUCTIONS_LEN} characters.` };
      }
    }
    items.push({
      id,
      title,
      instructions,
      required: raw.required !== false,
    });
  }
  return items;
}

export function buildDeliverablesDefinitionPatch(
  existingMetadata: Record<string, unknown>,
  items: StaffAssignmentDeliverableDef[],
  updatedBy?: string | null,
): Record<string, unknown> {
  const next: StaffAssignmentDeliverablesDefinition = {
    v: 1,
    items,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy ?? null,
  };
  return {
    ...existingMetadata,
    [STAFF_ASSIGNMENT_DELIVERABLES_KEY]: next,
  };
}

export function buildDeliverableProgressPatch(
  existingMetadata: Record<string, unknown>,
  assigneeUserId: number,
  completed: Record<string, StaffDeliverableCompletionRecord>,
): Record<string, unknown> {
  const next: StaffDeliverableProgressState = {
    v: 1,
    assigneeUserId,
    completed,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...existingMetadata,
    [STAFF_DELIVERABLE_PROGRESS_KEY]: next,
  };
}

export function mergeDeliverableViews(
  definition: StaffAssignmentDeliverablesDefinition | null,
  progress: StaffDeliverableProgressState | null,
): StaffDeliverableView[] {
  if (!definition?.items.length) return [];
  const completed = progress?.completed ?? {};
  return definition.items.map((item) => {
    const record = completed[item.id];
    return {
      id: item.id,
      title: item.title,
      instructions: item.instructions,
      required: item.required,
      completed: Boolean(record?.completedAt),
      completedAt: record?.completedAt ?? null,
    };
  });
}

export function summarizeDeliverableProgress(
  views: StaffDeliverableView[],
): StaffDeliverableProgressSummary {
  const total = views.length;
  const completed = views.filter((v) => v.completed).length;
  const requiredViews = views.filter((v) => v.required);
  const requiredTotal = requiredViews.length;
  const requiredCompleted = requiredViews.filter((v) => v.completed).length;
  return {
    total,
    completed,
    requiredTotal,
    requiredCompleted,
    allRequiredComplete: requiredTotal === 0 || requiredCompleted === requiredTotal,
  };
}

export function allRequiredDeliverablesComplete(views: StaffDeliverableView[]): boolean {
  return summarizeDeliverableProgress(views).allRequiredComplete;
}

export function sanitizeDeliverableTogglePayload(
  definition: StaffAssignmentDeliverablesDefinition | null,
  input: Record<string, unknown> | null | undefined,
): { toggles: Record<string, boolean> } | { error: string } {
  if (!definition?.items.length) {
    return { error: "This assignment has no structured deliverables." };
  }
  if (!input || typeof input !== "object") return { error: "Invalid deliverables payload." };
  const validIds = new Set(definition.items.map((i) => i.id));
  const toggles: Record<string, boolean> = {};
  for (const key of Object.keys(input)) {
    if (!validIds.has(key)) {
      return { error: "Unknown deliverable id." };
    }
    toggles[key] = Boolean(input[key]);
  }
  if (Object.keys(toggles).length === 0) {
    return { error: "No deliverable updates provided." };
  }
  return { toggles };
}

export function applyDeliverableToggles(
  definition: StaffAssignmentDeliverablesDefinition,
  prior: StaffDeliverableProgressState | null,
  toggles: Record<string, boolean>,
  nowIso: string,
): Record<string, StaffDeliverableCompletionRecord> {
  const next: Record<string, StaffDeliverableCompletionRecord> = {
    ...(prior?.completed ?? {}),
  };
  for (const item of definition.items) {
    if (!(item.id in toggles)) continue;
    if (toggles[item.id]) {
      if (!next[item.id]?.completedAt) {
        next[item.id] = { completedAt: nowIso };
      }
    } else {
      delete next[item.id];
    }
  }
  return next;
}

/** Drop completion records that no longer exist on the assignment definition. */
export function pruneDeliverableCompletionsForDefinition(
  definition: StaffAssignmentDeliverablesDefinition,
  prior: StaffDeliverableProgressState | null,
): Record<string, StaffDeliverableCompletionRecord> {
  const valid = new Set(definition.items.map((item) => item.id));
  const source = prior?.completed ?? {};
  const next: Record<string, StaffDeliverableCompletionRecord> = {};
  for (const id of Object.keys(source)) {
    if (valid.has(id)) next[id] = source[id];
  }
  return next;
}

export function applyDeliverableTogglesWithDefinition(
  metadata: Record<string, unknown>,
  assigneeUserId: number,
  toggles: Record<string, boolean>,
  nowIso: string,
): Record<string, unknown> | { error: string } {
  const definition = parseDeliverablesDefinition(metadata);
  const sanitized = sanitizeDeliverableTogglePayload(definition, toggles);
  if ("error" in sanitized) return sanitized;
  const prior = parseDeliverableProgress(metadata, assigneeUserId);
  const completed = applyDeliverableToggles(
    definition!,
    prior,
    sanitized.toggles,
    nowIso,
  );
  return buildDeliverableProgressPatch(metadata, assigneeUserId, completed);
}

export function formatDeliverableActivityDetail(views: StaffDeliverableView[]): string {
  const summary = summarizeDeliverableProgress(views);
  if (summary.total === 0) return "No deliverables defined.";
  return `${summary.completed} of ${summary.total} deliverables complete`;
}

/** Readable instruction blocks — preserves line breaks without inferring deliverables. */
export function formatInstructionBlocks(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const byParagraph = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (byParagraph.length > 1) return byParagraph;
  return normalized.split("\n").map((line) => line.trim()).filter(Boolean);
}
