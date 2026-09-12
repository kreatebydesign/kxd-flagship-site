/**
 * Executive Performance eligibility — entitlement-first, registry optional.
 *
 * A client receives EP when:
 * - CES/profile entitles `executive-performance`, OR
 * - legacy presentation registry has enabled:true (backward compatible)
 *
 * Brand presentation registry is optional CONTENT, not a structural gate.
 * Partial reporting data is supported — compose never fabricates metrics.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { isCesModuleEnabled } from "@/lib/ces/types";
import type { ExperiencePresentation } from "./types";
import { getExecutivePresentation } from "./presentation";

const DEFAULT_ZONE_ORDER = [
  "summary",
  "performance",
  "progress",
  "collaboration",
  "growth",
  "account",
] as const satisfies NonNullable<ExperiencePresentation["zoneOrder"]>;

/** Neutral default when entitled but no brand registry entry exists. */
export function buildDefaultExecutivePresentation(
  profile: ResolvedExperienceProfile,
): ExperiencePresentation {
  const name = profile.identity.clientName || "Partnership";
  return {
    enabled: true,
    briefingEnabled: false,
    executiveReviewEnabled: false,
    heroImageSrc: "",
    heroImageAlt: `${name} partnership workspace`,
    heroOverlay: "graphite",
    logoSrc: profile.identity.logoUrl,
    logoAlt: profile.identity.logoAlt || name,
    workspaceEyebrow: "Private Partnership Workspace",
    workspaceTitle: "Executive Performance",
    introduction: "Where things stand — and what deserves attention next.",
    actionAccent: profile.visual.accentColor || undefined,
    intelligenceAccent: profile.visual.primaryColor || undefined,
    zoneOrder: [...DEFAULT_ZONE_ORDER],
  };
}

/**
 * Entitlement or legacy registry enablement.
 * Does not require every reporting integration.
 */
export function isExecutivePerformanceEligible(
  profile: ResolvedExperienceProfile,
): boolean {
  if (isCesModuleEnabled(profile, "executive-performance")) return true;
  return Boolean(getExecutivePresentation(profile.identity.clientSlug)?.enabled);
}

/**
 * Resolve presentation theme: registry brand assets when present,
 * otherwise a neutral default for entitled clients.
 */
export function resolveExecutivePresentationForProfile(
  profile: ResolvedExperienceProfile,
): ExperiencePresentation | null {
  const registered = getExecutivePresentation(profile.identity.clientSlug);
  if (registered?.enabled) {
    return {
      ...registered,
      logoSrc: profile.identity.logoUrl ?? registered.logoSrc,
      logoAlt: profile.identity.logoAlt || registered.logoAlt,
    };
  }
  if (isCesModuleEnabled(profile, "executive-performance")) {
    if (registered) {
      // Registry stub exists but disabled — still allow entitled compose with defaults,
      // merging any brand accents the stub already carries.
      const defaults = buildDefaultExecutivePresentation(profile);
      return {
        ...defaults,
        actionAccent: registered.actionAccent ?? defaults.actionAccent,
        intelligenceAccent:
          registered.intelligenceAccent ?? defaults.intelligenceAccent,
        logoSrc: profile.identity.logoUrl ?? registered.logoSrc ?? defaults.logoSrc,
        logoAlt: profile.identity.logoAlt || registered.logoAlt || defaults.logoAlt,
        heroImageSrc: registered.heroImageSrc || defaults.heroImageSrc,
        heroImageAlt: registered.heroImageAlt || defaults.heroImageAlt,
        heroOverlay: registered.heroOverlay || defaults.heroOverlay,
        heroFocus: registered.heroFocus,
      };
    }
    return buildDefaultExecutivePresentation(profile);
  }
  return registered;
}
