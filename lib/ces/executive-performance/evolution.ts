/**
 * Phase 31A — Partnership evolution (Growing Together).
 * A handful of future opportunities — not a software catalog.
 */

import type { ExecutiveEvolutionItem } from "./types";

const PRIMAL_EVOLUTION: ExecutiveEvolutionItem[] = [
  {
    id: "lead-management",
    label: "Lead Management",
    detail: "A clearer path from inquiry to conversation — when the volume warrants it.",
  },
  {
    id: "executive-reporting",
    label: "Executive Reporting",
    detail: "Deeper recurring visibility into what is moving the business.",
  },
  {
    id: "customer-journey",
    label: "Customer Journey",
    detail: "Connect marketing, site, and follow-through into one operating picture.",
  },
  {
    id: "expansion",
    label: "Expansion",
    detail: "New markets and programs — paced to what the partnership can sustain.",
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
  },
  {
    id: "growth",
    label: "Growth partners",
    detail: "Additional channels when the foundation is ready.",
  },
  {
    id: "expansion",
    label: "Expansion",
    detail: "New workstreams when leadership is ready to grow.",
  },
];

export function getExecutiveEvolution(
  clientSlug: string | null,
): ExecutiveEvolutionItem[] {
  if (clientSlug && BY_SLUG[clientSlug]) return BY_SLUG[clientSlug];
  return DEFAULT_EVOLUTION;
}
