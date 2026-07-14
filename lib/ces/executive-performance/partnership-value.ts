/**
 * Phase 31A.2 — Partnership progress (Shared Core, slug-configured).
 * Relationship language — not project management.
 */

import type { ExecutivePartnershipItem } from "./types";

const PRIMAL_PARTNERSHIP: ExecutivePartnershipItem[] = [
  {
    id: "website-rebuild",
    label: "Your website, rebuilt",
    detail: "We've rebuilt the flagship site and refined it toward launch readiness.",
    complete: true,
    priority: true,
  },
  {
    id: "landing-pages",
    label: "Landing experiences shaped with care",
    detail: "Pages designed to meet people arriving from advertising — clear, composed, and on-brand.",
    complete: true,
    priority: true,
  },
  {
    id: "google-ads",
    label: "Advertising refined with care",
    detail: "Google Ads work that protects investment and attracts qualified interest.",
    complete: true,
    priority: true,
  },
  {
    id: "seo",
    label: "Search presence established",
    detail: "Foundational search work is in place so people can find you more clearly over time.",
    complete: true,
    priority: true,
  },
  {
    id: "website-review",
    label: "A private place to refine the site together",
    detail: "Website Review keeps revision notes organized in one private place.",
    complete: true,
    priority: true,
  },
  {
    id: "reporting",
    label: "Executive clarity, prepared",
    detail: "This workspace is structured so leadership can see what matters when signals are ready.",
    complete: true,
    priority: true,
  },
  {
    id: "portal",
    label: "Your private partnership workspace",
    detail: "A quiet operating environment built for leadership — not a generic client portal.",
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
    label: "Your private partnership workspace",
    detail: "A calm place for leadership to follow the work with us.",
    complete: true,
    priority: true,
  },
  {
    id: "website-review",
    label: "A private place to refine the site together",
    detail: "Feedback stays organized so we can refine with confidence.",
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
