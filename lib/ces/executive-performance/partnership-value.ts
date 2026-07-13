/**
 * Phase 31A — Partnership value narratives (Shared Core, slug-configured).
 * Real accomplishments only — no marketing fluff.
 */

import type { ExecutivePartnershipItem } from "./types";

const PRIMAL_PARTNERSHIP: ExecutivePartnershipItem[] = [
  {
    id: "website-rebuild",
    label: "Website rebuild",
    detail: "Flagship site rebuilt for the brand and refined toward launch.",
    complete: true,
  },
  {
    id: "landing-pages",
    label: "Landing experiences",
    detail: "Conversion-focused pages aligned with advertising demand.",
    complete: true,
  },
  {
    id: "google-ads",
    label: "Google Ads optimization",
    detail: "Continuous refinement to protect spend and improve qualified traffic.",
    complete: true,
  },
  {
    id: "seo",
    label: "Search visibility work",
    detail: "Foundational SEO and Search Console visibility established.",
    complete: true,
  },
  {
    id: "website-review",
    label: "Website Review collaboration",
    detail: "A private channel for precise revision notes — nothing lost.",
    complete: true,
  },
  {
    id: "reporting",
    label: "Executive reporting foundation",
    detail: "This workspace structures performance for leadership — live signal connects when entitlements are enabled.",
    complete: true,
  },
  {
    id: "portal",
    label: "Partnership workspace",
    detail: "This private operating environment for leadership.",
    complete: true,
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
  },
  {
    id: "website-review",
    label: "Website Review",
    detail: "Organized collaboration around website revisions.",
    complete: true,
  },
];

export function getExecutivePartnershipValue(
  clientSlug: string | null,
): ExecutivePartnershipItem[] {
  if (clientSlug && BY_SLUG[clientSlug]) return BY_SLUG[clientSlug];
  return DEFAULT_PARTNERSHIP;
}
