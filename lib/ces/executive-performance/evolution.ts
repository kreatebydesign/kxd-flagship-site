/**
 * Phase 31A.2 — Growth opportunities (Shared Core).
 * Possibility — not a catalog, not an upsell.
 */

import type { ExecutiveEvolutionItem } from "./types";

const PRIMAL_EVOLUTION: ExecutiveEvolutionItem[] = [
  {
    id: "lead-management",
    label: "Lead Management",
    detail:
      "A clearer path from inquiry to conversation — so promising interest is never left waiting.",
    maturity: "next",
  },
  {
    id: "executive-reporting",
    label: "Executive Reporting",
    detail:
      "A calm, recurring view of what is moving the business — prepared for leadership, not buried in tools.",
    maturity: "next",
  },
  {
    id: "customer-journey",
    label: "Customer Journey",
    detail:
      "One continuous picture from first interest to long-term relationship — marketing, site, and follow-through together.",
    maturity: "future",
  },
  {
    id: "expansion",
    label: "Expansion",
    detail:
      "Room to grow into new programs when the partnership has the capacity — paced thoughtfully, never rushed.",
    maturity: "future",
  },
];

const BY_SLUG: Record<string, ExecutiveEvolutionItem[]> = {
  "primal-motorsports": PRIMAL_EVOLUTION,
};

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
  const items =
    clientSlug && BY_SLUG[clientSlug] ? BY_SLUG[clientSlug] : DEFAULT_EVOLUTION;
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
