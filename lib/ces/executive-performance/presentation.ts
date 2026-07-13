/**
 * Phase 31A — Client presentation themes for Executive Performance.
 * Shared Core registry — brand assets and copy, not entitlements.
 */

import type { ExperiencePresentation } from "./types";

const DEFAULT_ZONE_ORDER = [
  "summary",
  "performance",
  "progress",
  "collaboration",
  "growth",
  "account",
] as const satisfies NonNullable<ExperiencePresentation["zoneOrder"]>;

const PRIMAL_PRESENTATION: ExperiencePresentation = {
  enabled: true,
  heroImageSrc: "/migrated-assets/case-studies/primal-motorsports/hero.webp",
  heroImageAlt: "Primal Motorsports — precision and performance",
  heroOverlay: "graphite",
  logoSrc: "/migrated-assets/logos/primal.svg",
  logoAlt: "Primal Motorsports",
  workspaceEyebrow: "Private Partnership Workspace",
  workspaceTitle: "Executive Performance",
  introduction:
    "A calm view of the partnership — where the work stands, and what deserves attention next.",
  zoneOrder: [...DEFAULT_ZONE_ORDER],
};

const BY_SLUG: Record<string, ExperiencePresentation> = {
  "primal-motorsports": PRIMAL_PRESENTATION,
};

export function getExecutivePresentation(
  clientSlug: string | null | undefined,
): ExperiencePresentation | null {
  if (!clientSlug) return null;
  return BY_SLUG[clientSlug] ?? null;
}

export function isExecutivePerformanceAvailable(
  clientSlug: string | null | undefined,
): boolean {
  return Boolean(getExecutivePresentation(clientSlug)?.enabled);
}

export function getExecutiveZoneOrder(
  presentation: ExperiencePresentation,
): NonNullable<ExperiencePresentation["zoneOrder"]> {
  return presentation.zoneOrder?.length
    ? presentation.zoneOrder
    : [...DEFAULT_ZONE_ORDER];
}
