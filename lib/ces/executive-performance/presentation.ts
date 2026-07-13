/**
 * Phase 31A — Client presentation themes for Executive Performance.
 * Shared Core registry — brand assets and copy, not business logic.
 */

import type { ExperiencePresentation } from "./types";

const DEFAULT_SECTION_ORDER = [
  "hero",
  "recommendation",
  "performance",
  "partnership",
  "impact",
  "website-review",
  "evolution",
] as const satisfies NonNullable<ExperiencePresentation["sectionOrder"]>;

/**
 * Primal Motorsports — first branded implementation.
 * Other clients add an entry here (or via future profile fields) — no component fork.
 */
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
    "A calm view of the partnership — where the work stands, what it is delivering, and what deserves your attention next.",
  sectionOrder: [...DEFAULT_SECTION_ORDER],
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
  const presentation = getExecutivePresentation(clientSlug);
  return Boolean(presentation?.enabled);
}
