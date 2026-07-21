import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getEditionBranding } from "@/lib/editions";
import type { PortalSession } from "@/lib/portal/session";
import {
  ALL_REPORTING_CAPABILITIES,
  type ReportingCapabilityId,
} from "@/lib/reporting/domain/capabilities";
import { getExecutivePresentation } from "../executive-performance/presentation";
import type { CesModuleId, ResolvedExperienceProfile } from "../types";
import {
  buildFallbackHospitality,
  buildFallbackVisual,
  CES_DEFAULT_PARTNER_FOOTER,
  mergeProfileWithFallback,
  normalizeBorderRadius,
  normalizeMotionPreset,
  normalizeSupportTone,
  parseTerminology,
} from "./defaults";
import { experienceProfileToCssVars } from "./tokens";
import { PRIMAL_CLIENT_SLUG, PRIMAL_EXPERIENCE_PROFILE } from "./primal";

type AnyDoc = Record<string, unknown>;

const COLLECTION = "client-experience-profiles";

const CES_MODULE_IDS = new Set<CesModuleId>([
  "website-review",
  "website-workspace",
  "executive-performance",
  "executive-review",
  "inventory",
]);

const REPORTING_CAPABILITY_SET = new Set<string>(ALL_REPORTING_CAPABILITIES);

function mediaUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as AnyDoc;
  return doc.url ? String(doc.url) : null;
}

function normalizeEnabledModules(value: unknown): CesModuleId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CesModuleId =>
    typeof item === "string" && CES_MODULE_IDS.has(item as CesModuleId),
  );
}

function normalizeReportingCapabilities(value: unknown): ReportingCapabilityId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ReportingCapabilityId =>
      typeof item === "string" && REPORTING_CAPABILITY_SET.has(item),
  );
}

async function loadOnboardingLogo(clientId: number): Promise<string | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-onboarding" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });
  if (result.docs.length === 0) return null;
  const onboarding = result.docs[0] as AnyDoc;
  const logoFiles = onboarding.logoFiles;
  if (!Array.isArray(logoFiles) || logoFiles.length === 0) return null;
  return mediaUrl(logoFiles[0]);
}

function ensurePrimalWebsiteWorkspace(profile: ResolvedExperienceProfile): void {
  if (profile.identity.clientSlug !== PRIMAL_CLIENT_SLUG) return;
  if (!profile.enabledModules.includes("website-review")) return;
  if (!profile.enabledModules.includes("website-workspace")) {
    profile.enabledModules = [...profile.enabledModules, "website-workspace"];
  }
  for (const [key, value] of Object.entries(PRIMAL_EXPERIENCE_PROFILE.terminology)) {
    if (key.startsWith("nav.website-workspace") || key.startsWith("website-workspace.")) {
      if (!profile.terminology[key]) profile.terminology[key] = value;
    }
  }
}

/** V1 — ensure Executive Review entitlement for Primal without requiring a reseed. */
function ensurePrimalExecutiveReview(profile: ResolvedExperienceProfile): void {
  if (profile.identity.clientSlug !== PRIMAL_CLIENT_SLUG) return;
  if (!profile.enabledModules.includes("website-review")) return;
  if (!profile.enabledModules.includes("executive-review")) {
    profile.enabledModules = [...profile.enabledModules, "executive-review"];
  }
  if (!profile.terminology["nav.executive-review"]) {
    profile.terminology["nav.executive-review"] =
      PRIMAL_EXPERIENCE_PROFILE.terminology["nav.executive-review"];
  }
}

function finalizeProfile(profile: ResolvedExperienceProfile): ResolvedExperienceProfile {
  ensurePrimalWebsiteWorkspace(profile);
  ensurePrimalExecutiveReview(profile);
  const presentation = getExecutivePresentation(profile.identity.clientSlug);
  profile.presentation = presentation;
  /* Presentation Registry supplies brand mark when no CMS/onboarding logo exists. */
  if (presentation?.logoSrc && !profile.identity.logoUrl) {
    profile.identity.logoUrl = presentation.logoSrc;
    if (presentation.logoAlt) {
      profile.identity.logoAlt = presentation.logoAlt;
    }
  }
  profile.cssVars = {
    ...experienceProfileToCssVars(profile.visual),
    ...(presentation
      ? {
          "--kxd-ces-hero-image": `url(${presentation.heroImageSrc})`,
          ...(presentation.actionAccent
            ? { "--kxd-ces-accent": presentation.actionAccent }
            : {}),
          ...(presentation.intelligenceAccent
            ? {
                "--kxd-ces-intelligence": presentation.intelligenceAccent,
                "--kxd-ces-identity-name": presentation.intelligenceAccent,
              }
            : {}),
        }
      : {}),
  };
  return profile;
}

/**
 * Phase 35A — intersect CES modules with Client Plans entitlements when a plan
 * is explicitly assigned. Legacy / unassigned clients keep existing CES access.
 */
async function applyClientPlanEntitlements(
  profile: ResolvedExperienceProfile,
): Promise<ResolvedExperienceProfile> {
  try {
    const { resolveClientEntitlements } = await import("@/lib/client-plans");
    const entitlements = await resolveClientEntitlements(profile.identity.clientId);
    if (entitlements.isLegacy) return profile;

    const allowed = new Set(entitlements.effectiveModules);
    profile.enabledModules = profile.enabledModules.filter((moduleId) =>
      allowed.has(moduleId),
    );
    profile.reportingCapabilities = profile.reportingCapabilities.filter(
      (capability) => allowed.has(capability),
    );
  } catch (err) {
    console.error(
      "[KXD CES] Client plan entitlement gate failed; keeping CES modules:",
      err,
    );
  }
  return profile;
}

export async function resolveExperienceProfile(
  session: PortalSession,
): Promise<ResolvedExperienceProfile> {
  const editionBranding = getEditionBranding();
  const payload = await getPayload({ config });

  let clientDoc: AnyDoc | null = null;
  try {
    clientDoc = (await payload.findByID({
      collection: "clients",
      id: session.clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as AnyDoc;
  } catch {
    clientDoc = null;
  }

  const clientName = String(clientDoc?.name ?? session.clientName ?? "Your workspace");
  const clientSlug = clientDoc?.slug ? String(clientDoc.slug) : null;
  const websiteUrl = clientDoc?.companyWebsite ? String(clientDoc.companyWebsite) : null;

  const identityBase = {
    clientId: session.clientId,
    clientName,
    clientSlug,
    logoUrl: null as string | null,
    logoAlt: clientName,
    websiteUrl,
  };

  const fallbackVisual = buildFallbackVisual(editionBranding);
  const fallback = await applyClientPlanEntitlements(
    finalizeProfile(
      mergeProfileWithFallback(
        {
          source: "fallback",
          identity: identityBase,
          visual: fallbackVisual,
          hospitality: buildFallbackHospitality(clientName, editionBranding),
          enabledModules: [],
          reportingCapabilities: [],
          presentation: null,
          terminology: {},
          cssVars: experienceProfileToCssVars(fallbackVisual),
        },
        editionBranding,
      ),
    ),
  );

  let profileDoc: AnyDoc | null = null;
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      where: {
        and: [
          { client: { equals: session.clientId } },
          { status: { equals: "active" } },
        ],
      },
      limit: 1,
      depth: 2,
      overrideAccess: true,
    });
    profileDoc = result.docs.length > 0 ? (result.docs[0] as AnyDoc) : null;
  } catch {
    return fallback;
  }

  if (!profileDoc) {
    const onboardingLogo = await loadOnboardingLogo(session.clientId);
    if (onboardingLogo) {
      fallback.identity.logoUrl = onboardingLogo;
    }
    return finalizeProfile(fallback);
  }

  const brandKit =
    profileDoc.brandKit && typeof profileDoc.brandKit === "object"
      ? (profileDoc.brandKit as AnyDoc)
      : null;

  const logoOverride = mediaUrl(profileDoc.logoOverride);
  const onboardingLogo = logoOverride ?? (await loadOnboardingLogo(session.clientId));

  const visual = {
    primaryColor:
      String(profileDoc.primaryColor ?? brandKit?.primaryColor ?? fallbackVisual.primaryColor),
    secondaryColor:
      String(profileDoc.secondaryColor ?? brandKit?.secondaryColor ?? fallbackVisual.secondaryColor),
    accentColor:
      String(profileDoc.accentColor ?? brandKit?.accentColor ?? fallbackVisual.accentColor),
    surfaceTint: profileDoc.surfaceTint ? String(profileDoc.surfaceTint) : null,
    borderRadiusPreset: normalizeBorderRadius(profileDoc.borderRadiusPreset),
    motionPreset: normalizeMotionPreset(profileDoc.motionPreset),
  };

  const hospitality = {
    welcomeEyebrow: String(
      profileDoc.welcomeEyebrow ?? buildFallbackHospitality(clientName, editionBranding).welcomeEyebrow,
    ),
    reassuranceLine: String(
      profileDoc.reassuranceLine ?? buildFallbackHospitality(clientName, editionBranding).reassuranceLine,
    ),
    supportTone: normalizeSupportTone(profileDoc.supportTone),
    portalSidebarLabel: String(
      profileDoc.portalSidebarLabel ?? clientName,
    ),
    partnerFooterLine: String(
      profileDoc.partnerFooterLine ?? CES_DEFAULT_PARTNER_FOOTER,
    ),
    showPartnerMark: profileDoc.showKxdPartnerMark !== false,
  };

  const enabledRaw = profileDoc.enabledModules;
  const resolved = mergeProfileWithFallback(
    {
      profileId: profileDoc.id as number,
      source: "profile",
      identity: {
        ...identityBase,
        logoUrl: onboardingLogo,
        logoAlt: String(brandKit?.brandName ?? clientName),
      },
      visual,
      hospitality,
      enabledModules: normalizeEnabledModules(enabledRaw),
      reportingCapabilities: normalizeReportingCapabilities(enabledRaw),
      presentation: null,
      terminology: parseTerminology(profileDoc.terminology),
      cssVars: {},
    },
    editionBranding,
  );

  return applyClientPlanEntitlements(finalizeProfile(resolved));
}
