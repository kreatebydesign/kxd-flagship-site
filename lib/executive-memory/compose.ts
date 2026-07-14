/**
 * Slice and project Executive Memory for presentation adapters.
 */

import { getExecutiveMemoryLens } from "./registry";
import type {
  ExecutiveMemoryItem,
  ExecutiveMemorySlice,
  ExecutiveMemoryStatus,
} from "./types";

function byStatus(
  items: ExecutiveMemoryItem[],
  status: ExecutiveMemoryStatus,
): ExecutiveMemoryItem[] {
  return items.filter((item) => item.status === status);
}

export function composeExecutiveMemorySlice(
  clientSlug: string | null | undefined,
): ExecutiveMemorySlice | null {
  const lens = getExecutiveMemoryLens(clientSlug);
  if (!lens) return null;

  const story = lens.items.filter(
    (item) =>
      item.presentation?.storyBeatId ||
      item.kind === "milestone" ||
      item.kind === "launch" ||
      item.kind === "delivery",
  );

  return {
    clientSlug: lens.clientSlug,
    completed: byStatus(lens.items, "completed"),
    active: byStatus(lens.items, "active"),
    inProgress: byStatus(lens.items, "in-progress"),
    planned: byStatus(lens.items, "planned"),
    story,
  };
}

/** Partnership strip projection — preserves EP progress presentation. */
export function memoryToPartnershipItems(clientSlug: string | null | undefined): Array<{
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  priority?: boolean;
}> | null {
  const lens = getExecutiveMemoryLens(clientSlug);
  if (!lens || lens.items.length === 0) return null;

  const items = lens.items.filter((item) => item.presentation?.partnershipItemId);
  if (items.length === 0) return null;

  return items.map((item) => ({
    id: item.presentation!.partnershipItemId!,
    label: item.label,
    detail: item.statement,
    complete: item.status === "completed" || item.status === "active",
    priority: item.priority,
  }));
}

/** Story timeline projection for EP progress beats. */
export function memoryToStoryBeats(clientSlug: string | null | undefined): Array<{
  id: string;
  label: string;
  complete: boolean;
}> | null {
  const lens = getExecutiveMemoryLens(clientSlug);
  if (!lens) return null;

  const beats = lens.items.filter((item) => item.presentation?.storyBeatId);
  if (beats.length === 0) return null;

  /* Preserve curated order from configuration. */
  const seen = new Set<string>();
  const ordered: Array<{ id: string; label: string; complete: boolean }> = [];
  for (const item of beats) {
    const id = item.presentation!.storyBeatId!;
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push({
      id,
      label: item.label,
      /* Planned beats stay ahead; completed / active / in-progress read as done in the journey. */
      complete: item.status !== "planned",
    });
  }
  return ordered;
}

export function memoryStatementsByKind(
  clientSlug: string | null | undefined,
  kinds: ExecutiveMemoryItem["kind"][],
): string[] {
  const lens = getExecutiveMemoryLens(clientSlug);
  if (!lens) return [];
  const allow = new Set(kinds);
  return lens.items
    .filter((item) => allow.has(item.kind))
    .map((item) => item.statement);
}

/** Flagship milestone strip — curated order from configuration. */
export function memoryToMilestones(clientSlug: string | null | undefined): Array<{
  id: string;
  label: string;
  complete: boolean;
}> | null {
  const lens = getExecutiveMemoryLens(clientSlug);
  if (!lens || lens.items.length === 0) return null;

  const seen = new Set<string>();
  const ordered: Array<{ id: string; label: string; complete: boolean }> = [];
  for (const item of lens.items) {
    const id = item.presentation?.milestoneId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push({
      id,
      label: item.presentation?.milestoneLabel ?? item.label,
      complete: item.status === "completed" || item.status === "active" || item.status === "in-progress",
    });
  }
  return ordered.length > 0 ? ordered : null;
}

/** Growth opportunities — possibility language from memory. */
export function memoryToEvolutionItems(clientSlug: string | null | undefined): Array<{
  id: string;
  label: string;
  detail: string;
  maturity: "available-now" | "next" | "future";
}> | null {
  const lens = getExecutiveMemoryLens(clientSlug);
  if (!lens || lens.items.length === 0) return null;

  const items = lens.items.filter((item) => item.presentation?.evolutionId);
  if (items.length === 0) return null;

  return items.map((item) => ({
    id: item.presentation!.evolutionId!,
    label: item.label,
    detail: item.statement,
    maturity: item.status === "active" ? ("available-now" as const) : item.priority ? ("next" as const) : ("future" as const),
  }));
}
