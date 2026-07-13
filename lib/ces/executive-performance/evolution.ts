/**
 * Phase 31A.2 — Growth opportunities (Shared Core).
 * Human outcomes — not a software catalog. Max 3–4 items.
 */

import type { ExecutiveEvolutionItem } from "./types";

const PRIMAL_EVOLUTION: ExecutiveEvolutionItem[] = [
  {
    id: "lead-management",
    label: "Lead Management",
    detail: "A clearer path from inquiry to conversation.",
    maturity: "next",
  },
  {
    id: "executive-reporting",
    label: "Executive Reporting",
    detail: "Deeper recurring visibility into what moves the business.",
    maturity: "next",
  },
  {
    id: "customer-journey",
    label: "Customer Journey",
    detail: "Connect marketing, site, and follow-through into one picture.",
    maturity: "future",
  },
  {
    id: "expansion",
    label: "Expansion",
    detail: "New markets and programs — paced to partnership capacity.",
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
    detail: "Recurring clarity on partnership performance.",
    maturity: "next",
  },
  {
    id: "growth",
    label: "Growth partners",
    detail: "Additional channels when the foundation is ready.",
    maturity: "future",
  },
  {
    id: "expansion",
    label: "Expansion",
    detail: "New workstreams when leadership is ready.",
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
      return "Available now";
    case "next":
      return "Next opportunity";
    default:
      return "Future";
  }
}
