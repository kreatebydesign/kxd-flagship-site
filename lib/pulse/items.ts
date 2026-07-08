import type { BusinessBrainResult } from "@/lib/business-brain";
import type { PulseChange, PulseItem, PulseWatchItem, StableSignal } from "./types";
import { pulseItemId } from "./utils";

/**
 * Assemble top-level pulse awareness items from changes, watchlist, and stable signals.
 */
export function buildPulseItems(
  brain: BusinessBrainResult,
  changes: PulseChange[],
  watchlist: PulseWatchItem[],
  stableSignals: StableSignal[],
): PulseItem[] {
  const items: PulseItem[] = [];

  for (const change of changes.filter((c) => c.significance !== "low").slice(0, 5)) {
    items.push({
      id: pulseItemId("change", change.id),
      kind: change.direction === "new" ? "novel" : "change",
      title: change.label,
      description: change.description,
      significance: change.significance,
      taxonomy: change.taxonomy === "observation.novel" ? null : change.taxonomy,
      relatedClientId: null,
      relatedClientName: null,
    });
  }

  for (const watch of watchlist.slice(0, 4)) {
    items.push({
      id: pulseItemId("watch", watch.id),
      kind: "watch",
      title: watch.label,
      description: watch.context,
      significance: watch.severity === "critical" || watch.severity === "high" ? "high" : "moderate",
      taxonomy: watch.taxonomy,
      relatedClientId: null,
      relatedClientName: null,
    });
  }

  for (const attention of brain.attention.slice(0, 3)) {
    items.push({
      id: pulseItemId("awareness", attention.id),
      kind: "awareness",
      title: attention.title,
      description: attention.context,
      significance:
        attention.severity === "critical" || attention.severity === "high" ? "high" : "moderate",
      taxonomy: null,
      relatedClientId: attention.relatedClientId,
      relatedClientName: attention.relatedClientName,
    });
  }

  for (const stable of stableSignals.slice(0, 3)) {
    items.push({
      id: pulseItemId("stable", stable.id),
      kind: "stable",
      title: stable.label,
      description: stable.description,
      significance: "low",
      taxonomy: stable.taxonomy,
      relatedClientId: null,
      relatedClientName: null,
    });
  }

  const seen = new Set<string>();
  const significanceRank = { high: 0, moderate: 1, low: 2 };

  return items
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => significanceRank[a.significance] - significanceRank[b.significance])
    .slice(0, 12);
}
