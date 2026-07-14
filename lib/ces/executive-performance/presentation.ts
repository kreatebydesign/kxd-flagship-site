/**
 * Phase 31A / 32A — Client presentation themes for Executive Performance.
 * Shared Core registry — brand assets, color tokens, and copy. Not entitlements.
 * Enable a client by setting `enabled: true` and completing brand assets — no component forks.
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
  briefingEnabled: true,
  heroImageSrc: "/migrated-assets/projects/primal-motorsports-hero.jpg",
  heroImageAlt: "Radical race cars on track — Primal Motorsports",
  heroOverlay: "deep",
  /* 6000×4000 asset — lead #91 sits lower-center; prefer car body over sky. */
  heroFocus: "54% 58%",
  logoSrc: "/migrated-assets/logos/primal.svg",
  logoAlt: "Primal Motorsports",
  workspaceEyebrow: "Private Partnership Workspace",
  workspaceTitle: "Executive Performance",
  introduction: "Where things stand — and what deserves attention next.",
  actionAccent: "#A83424",
  intelligenceAccent: "#3A6EA5",
  zoneOrder: [...DEFAULT_ZONE_ORDER],
};

/** Disabled stubs — ready for brand assets + memory. EP appears when enabled. */
function stubPresentation(input: {
  logoAlt: string;
  heroImageAlt: string;
}): ExperiencePresentation {
  return {
    enabled: false,
    briefingEnabled: false,
    heroImageSrc: "",
    heroImageAlt: input.heroImageAlt,
    heroOverlay: "graphite",
    logoSrc: null,
    logoAlt: input.logoAlt,
    workspaceEyebrow: "Private Partnership Workspace",
    workspaceTitle: "Executive Performance",
    introduction: "Where things stand — and what deserves attention next.",
    zoneOrder: [...DEFAULT_ZONE_ORDER],
  };
}

const BY_SLUG: Record<string, ExperiencePresentation> = {
  "primal-motorsports": PRIMAL_PRESENTATION,
  "cusick-morgan-motorsports": stubPresentation({
    logoAlt: "Cusick Morgan Motorsports",
    heroImageAlt: "Cusick Morgan Motorsports",
  }),
  otp: stubPresentation({
    logoAlt: "On Track Performance",
    heroImageAlt: "On Track Performance",
  }),
  "plate-the-umpqua": stubPresentation({
    logoAlt: "Plate The Umpqua",
    heroImageAlt: "Plate The Umpqua",
  }),
  "e-davis-enterprises": stubPresentation({
    logoAlt: "E. Davis Enterprises",
    heroImageAlt: "E. Davis Enterprises",
  }),
  autodv8ions: stubPresentation({
    logoAlt: "AutoDV8ions",
    heroImageAlt: "AutoDV8ions",
  }),
};

export function listExecutivePresentationSlugs(): string[] {
  return Object.keys(BY_SLUG);
}

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
