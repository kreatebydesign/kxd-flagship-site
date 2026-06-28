import type { PlaybookDoc, PlaybookRunStatus } from "./types";

export function parseIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v))).map(Number);
}

export function computePercentComplete(
  totalSteps: number,
  completed: number[],
  skipped: number[],
): number {
  if (totalSteps <= 0) return 0;
  const done = new Set([...completed, ...skipped]).size;
  return Math.min(100, Math.round((done / totalSteps) * 100));
}

export function resolveRunStatus(
  totalSteps: number,
  completed: number[],
  skipped: number[],
  currentStatus: PlaybookRunStatus,
): PlaybookRunStatus {
  if (currentStatus === "blocked" || currentStatus === "archived") return currentStatus;
  const done = completed.length + skipped.length;
  if (totalSteps > 0 && done >= totalSteps) return "completed";
  if (done > 0 || currentStatus === "in-progress") return "in-progress";
  return currentStatus === "not-started" ? "not-started" : currentStatus;
}

export function findNextStepId(
  steps: PlaybookDoc[],
  completed: number[],
  skipped: number[],
): number | null {
  const done = new Set([...completed, ...skipped]);
  const ordered = [...steps].sort((a, b) => Number(a.order) - Number(b.order));
  for (const step of ordered) {
    const id = step.id as number;
    if (!done.has(id)) return id;
  }
  return null;
}

export function durationMinutesSince(startedAt: string | null | undefined): number | null {
  if (!startedAt) return null;
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return 0;
  return Math.round(ms / 60_000);
}
