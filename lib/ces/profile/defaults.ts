import type { EditionBranding } from "@/lib/editions";
import { KXD_CORE_BRANDING } from "@/lib/editions";
import type {
  ExperienceBorderRadiusPreset,
  ExperienceHospitality,
  ExperienceMotionPreset,
  ExperienceSupportTone,
  ExperienceVisual,
  ResolvedExperienceProfile,
} from "../types";

export const CES_DEFAULT_PARTNER_FOOTER = "Powered by Kreate by Design";

export const CES_DEFAULT_REASSURANCE = "Everything stays organized. Nothing gets lost.";

export const CES_DEFAULT_WELCOME_EYEBROW = "Welcome back";

export function buildFallbackHospitality(
  clientName: string,
  editionBranding: EditionBranding = KXD_CORE_BRANDING,
): ExperienceHospitality {
  return {
    welcomeEyebrow: editionBranding.portal.welcomeEyebrow || CES_DEFAULT_WELCOME_EYEBROW,
    reassuranceLine: CES_DEFAULT_REASSURANCE,
    supportTone: "warm-professional",
    portalSidebarLabel: clientName || editionBranding.portal.sidebarLabel,
    partnerFooterLine: editionBranding.footerText || CES_DEFAULT_PARTNER_FOOTER,
    showPartnerMark: true,
  };
}

export function buildFallbackVisual(
  editionBranding: EditionBranding = KXD_CORE_BRANDING,
): ExperienceVisual {
  return {
    primaryColor: editionBranding.primaryColor,
    secondaryColor: "#141414",
    accentColor: editionBranding.accentColor,
    surfaceTint: null,
    borderRadiusPreset: "default",
    motionPreset: "calm",
  };
}

export function normalizeSupportTone(value: unknown): ExperienceSupportTone {
  if (value === "direct" || value === "formal" || value === "warm-professional") {
    return value;
  }
  return "warm-professional";
}

export function normalizeBorderRadius(value: unknown): ExperienceBorderRadiusPreset {
  if (value === "soft" || value === "sharp" || value === "default") return value;
  return "default";
}

export function normalizeMotionPreset(value: unknown): ExperienceMotionPreset {
  if (value === "calm" || value === "default" || value === "reduced") return value;
  return "calm";
}

export function parseTerminology(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return out;
}

export function mergeProfileWithFallback(
  partial: Partial<ResolvedExperienceProfile> & Pick<ResolvedExperienceProfile, "identity">,
  editionBranding: EditionBranding,
): ResolvedExperienceProfile {
  const fallbackVisual = buildFallbackVisual(editionBranding);
  const fallbackHospitality = buildFallbackHospitality(
    partial.identity.clientName,
    editionBranding,
  );

  return {
    profileId: partial.profileId ?? null,
    source: partial.source ?? "fallback",
    identity: partial.identity,
    visual: { ...fallbackVisual, ...partial.visual },
    hospitality: { ...fallbackHospitality, ...partial.hospitality },
    enabledModules: partial.enabledModules ?? [],
    reportingCapabilities: partial.reportingCapabilities ?? [],
    presentation: partial.presentation ?? null,
    terminology: partial.terminology ?? {},
    cssVars: partial.cssVars ?? {},
  };
}
