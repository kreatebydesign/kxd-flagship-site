/**
 * Phase 31A.2 — Partnership progress (Shared Core, slug-configured).
 * Prioritize 5–7 high-signal items; remainder folds into disclosure.
 */

import type { ExecutivePartnershipItem } from "./types";

const PRIMAL_PARTNERSHIP: ExecutivePartnershipItem[] = [
  {
    id: "website-rebuild",
    label: "Website rebuild",
    detail: "Flagship site rebuilt and refined toward launch.",
    complete: true,
    priority: true,
  },
  {
    id: "landing-pages",
    label: "Landing experiences",
    detail: "Conversion-focused pages aligned with advertising demand.",
    complete: true,
    priority: true,
  },
  {
    id: "google-ads",
    label: "Google Ads optimization",
    detail: "Ongoing refinement to protect spend and improve qualified traffic.",
    complete: true,
    priority: true,
  },
  {
    id: "seo",
    label: "Search visibility work",
    detail: "Foundational SEO and Search Console visibility established.",
    complete: true,
    priority: true,
  },
  {
    id: "website-review",
    label: "Website Review",
    detail: "Private channel for precise revision notes.",
    complete: true,
    priority: true,
  },
  {
    id: "reporting",
    label: "Executive reporting foundation",
    detail: "Leadership workspace structured for live signal when entitled.",
    complete: true,
    priority: true,
  },
  {
    id: "portal",
    label: "Partnership workspace",
    detail: "This private operating environment for leadership.",
    complete: true,
    priority: false,
  },
];

const BY_SLUG: Record<string, ExecutivePartnershipItem[]> = {
  "primal-motorsports": PRIMAL_PARTNERSHIP,
};

const DEFAULT_PARTNERSHIP: ExecutivePartnershipItem[] = [
  {
    id: "workspace",
    label: "Private partnership workspace",
    detail: "A calm place for leadership to follow the work.",
    complete: true,
    priority: true,
  },
  {
    id: "website-review",
    label: "Website Review",
    detail: "Organized collaboration around website revisions.",
    complete: true,
    priority: true,
  },
];

export function getExecutivePartnershipValue(
  clientSlug: string | null,
): ExecutivePartnershipItem[] {
  if (clientSlug && BY_SLUG[clientSlug]) return BY_SLUG[clientSlug];
  return DEFAULT_PARTNERSHIP;
}

export function splitPartnershipPriority(items: ExecutivePartnershipItem[]): {
  primary: ExecutivePartnershipItem[];
  secondary: ExecutivePartnershipItem[];
} {
  const prioritized = items.filter((i) => i.priority !== false);
  const primary = (prioritized.length ? prioritized : items).slice(0, 7);
  const primaryIds = new Set(primary.map((i) => i.id));
  const secondary = items.filter((i) => !primaryIds.has(i.id));
  return { primary, secondary };
}
