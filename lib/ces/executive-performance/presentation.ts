/**
 * Phase 31A — Client presentation themes for Executive Performance.
 * Shared Core registry — brand assets, color tokens, and copy. Not entitlements.
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

/**
 * Primal Motorsports presentation.
 * Hero: editorial race photography (not a website screenshot).
 * Action accent = Primal red. Intelligence accent = Primal racing blue from livery.
 */
const PRIMAL_PRESENTATION: ExperiencePresentation = {
  enabled: true,
  heroImageSrc: "/migrated-assets/projects/primal-motorsports-hero.jpg",
  heroImageAlt: "Radical race cars on track — Primal Motorsports",
  heroOverlay: "deep",
  heroFocus: "62% 42%",
  logoSrc: "/migrated-assets/logos/primal.svg",
  logoAlt: "Primal Motorsports",
  workspaceEyebrow: "Private Partnership Workspace",
  workspaceTitle: "Executive Performance",
  introduction:
    "A calm view of the partnership — where the work stands, and what deserves attention next.",
  actionAccent: "#A83424",
  intelligenceAccent: "#2B6CB0",
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

/** CSS custom properties from presentation tokens (Shared Core — no client forks). */
export function executivePresentationToCssVars(
  presentation: ExperiencePresentation,
): Record<string, string> {
  const vars: Record<string, string> = {};
  if (presentation.heroImageSrc) {
    vars["--kxd-ces-exec-hero-image"] = `url(${presentation.heroImageSrc})`;
  }
  if (presentation.heroFocus) {
    vars["--kxd-ces-exec-hero-focus"] = presentation.heroFocus;
  }
  if (presentation.actionAccent) {
    vars["--kxd-ces-exec-action"] = presentation.actionAccent;
  }
  if (presentation.intelligenceAccent) {
    vars["--kxd-ces-exec-intelligence"] = presentation.intelligenceAccent;
  }
  return vars;
}
