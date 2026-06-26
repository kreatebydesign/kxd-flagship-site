/**
 * Pure timeline formatting — safe everywhere (no Payload / server-only).
 */
import type { ExecutiveTimelineDoc, ExecutiveTimelineMonthGroup } from "./types";

export function formatTimelineDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatTimelineMonth(iso: string): { monthKey: string; monthLabel: string } {
  const d = new Date(iso);
  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { monthKey, monthLabel };
}

export function groupEventsByMonth(events: ExecutiveTimelineDoc[]): ExecutiveTimelineMonthGroup[] {
  const groups = new Map<string, ExecutiveTimelineMonthGroup>();

  for (const event of events) {
    const occurredAt = String(event.occurredAt ?? event.createdAt ?? "");
    if (!occurredAt) continue;
    const { monthKey, monthLabel } = formatTimelineMonth(occurredAt);
    if (!groups.has(monthKey)) {
      groups.set(monthKey, { monthKey, monthLabel, events: [] });
    }
    groups.get(monthKey)!.events.push(event);
  }

  return [...groups.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
