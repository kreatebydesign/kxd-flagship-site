/**
 * Phase 31A.2 / 32A — Growth opportunities (Shared Core).
 * Prefers Executive Memory when authored. Possibility — not a catalog, not an upsell.
 */

import { memoryToEvolutionItems } from "@/lib/executive-memory";
import type { ExecutiveEvolutionItem } from "./types";

const DEFAULT_EVOLUTION: ExecutiveEvolutionItem[] = [
  {
    id: "executive-reporting",
    label: "Executive Reporting",
    detail: "A calm, recurring view of partnership performance prepared for leadership.",
    maturity: "next",
  },
  {
    id: "growth",
    label: "New channels",
    detail: "Additional ways to reach people when the foundation is ready — invited, never pressed.",
    maturity: "future",
  },
  {
    id: "expansion",
    label: "Expansion",
    detail: "New work when leadership is ready — paced to real capacity.",
    maturity: "future",
  },
];

export function getExecutiveEvolution(
  clientSlug: string | null,
): ExecutiveEvolutionItem[] {
  const fromMemory = memoryToEvolutionItems(clientSlug);
  const items = fromMemory && fromMemory.length > 0 ? fromMemory : DEFAULT_EVOLUTION;
  return items.slice(0, 4);
}

export function evolutionMaturityLabel(
  maturity: ExecutiveEvolutionItem["maturity"],
): string {
  switch (maturity) {
    case "available-now":
      return "Ready when you are";
    case "next":
      return "Natural next step";
    default:
      return "On the horizon";
  }
}
