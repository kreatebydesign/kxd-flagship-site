/** Phase 12A — Client Experience System types (client-safe) */

export type CesModuleId = "website-review";

export type ExperienceProfileSource = "profile" | "fallback";

export type ExperienceSupportTone = "warm-professional" | "direct" | "formal";

export type ExperienceBorderRadiusPreset = "soft" | "default" | "sharp";

export type ExperienceMotionPreset = "calm" | "default" | "reduced";

/** How the client should feel — clarity, confidence, calm, trust */
export interface ExperienceHospitality {
  welcomeEyebrow: string;
  reassuranceLine: string;
  supportTone: ExperienceSupportTone;
  portalSidebarLabel: string;
  partnerFooterLine: string;
  showPartnerMark: boolean;
}

export interface ExperienceIdentity {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  logoUrl: string | null;
  logoAlt: string;
  websiteUrl: string | null;
}

export interface ExperienceVisual {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceTint: string | null;
  borderRadiusPreset: ExperienceBorderRadiusPreset;
  motionPreset: ExperienceMotionPreset;
}

/** Resolved profile consumed by CES components and portal shell */
export interface ResolvedExperienceProfile {
  profileId: number | null;
  source: ExperienceProfileSource;
  identity: ExperienceIdentity;
  visual: ExperienceVisual;
  hospitality: ExperienceHospitality;
  enabledModules: CesModuleId[];
  terminology: Record<string, string>;
  cssVars: Record<string, string>;
}

export function isCesModuleEnabled(
  profile: ResolvedExperienceProfile,
  moduleId: CesModuleId,
): boolean {
  return profile.enabledModules.includes(moduleId);
}
