/**
 * Unified portal module visibility — Phase 2.
 *
 * edition ∩ plan (already applied on profile) ∩ CES profile ∩ security.
 * Website Review is one module. It does not select a different portal product.
 */

import { getConfiguredEditionId } from "@/lib/editions/configuration";
import { isModuleEnabledForEdition } from "@/lib/editions/modules";
import { getEditionById } from "@/lib/editions/registry";
import { isExecutiveClientBriefingAvailable } from "@/lib/executive-client-summary/availability";
import { isCesModuleEnabled, type ResolvedExperienceProfile } from "../types";
import { isExecutivePerformanceAvailable } from "../executive-performance/presentation";
import { applyPortalMemberReportsVisibility } from "@/lib/portal/member-reports-access";
import {
  getCanonicalCapability,
  impliedPortalModulesFromReporting,
  isCesExperienceModuleId,
  isPortalModuleId,
  listPortalCapabilityDefinitions,
  type PortalModuleId,
} from "./canonical";

export type PortalModuleVisibilityContext = {
  profile: ResolvedExperienceProfile;
  billingNavAvailable?: boolean;
  portfolioNavAvailable?: boolean;
  /** Active portal login email — used for member-scoped module gates (e.g. Primal Reports). */
  portalMemberEmail?: string | null;
  isOperatorPreview?: boolean;
};

function editionAllowsPortalModule(moduleId: PortalModuleId): boolean {
  const def = getCanonicalCapability(moduleId);
  if (!def?.editionModule) return true;
  const edition = getEditionById(getConfiguredEditionId());
  const hideIds = edition.customNavigation?.hidePortalNavIds ?? [];
  if (hideIds.includes(moduleId as never)) return false;
  return isModuleEnabledForEdition(def.editionModule, edition);
}

function enabledPortalIds(profile: ResolvedExperienceProfile): string[] {
  return profile.enabledPortalModules ?? profile.enabledModules;
}

/**
 * Active CES profiles allowlist HQ modules (empty list = no HQ nav noise).
 * Fallback / inactive CES keeps generic Client HQ defaults.
 * Website Review is never a portal-product switch.
 */
export function isActiveCesHqAllowlist(
  profile: ResolvedExperienceProfile,
): boolean {
  return profile.source === "profile";
}

function reportingImpliesModule(
  profile: ResolvedExperienceProfile,
  moduleId: PortalModuleId,
): boolean {
  return impliedPortalModulesFromReporting(profile.reportingCapabilities).includes(
    moduleId,
  );
}

function hqDefaultVisible(
  profile: ResolvedExperienceProfile,
  moduleId: PortalModuleId,
): boolean {
  if (!isActiveCesHqAllowlist(profile)) return true;
  return (
    enabledPortalIds(profile).includes(moduleId) ||
    reportingImpliesModule(profile, moduleId)
  );
}

export function isPortalModuleVisible(
  moduleId: string,
  ctx: PortalModuleVisibilityContext,
): boolean {
  if (!isPortalModuleId(moduleId)) return false;
  const def = getCanonicalCapability(moduleId);
  if (!def || def.kind !== "portal" || def.internalOnly || !def.portal) {
    return false;
  }

  const { profile } = ctx;
  if (!editionAllowsPortalModule(moduleId)) return false;

  let baseVisible = false;
  switch (def.portal.activation) {
    case "always":
      baseVisible = true;
      break;
    case "billing":
      baseVisible = ctx.billingNavAvailable === true;
      break;
    case "portfolio":
      baseVisible = ctx.portfolioNavAvailable === true;
      break;
    case "opt-in":
      baseVisible = enabledPortalIds(profile).includes(moduleId);
      break;
    case "ces-opt-in":
      baseVisible =
        isCesExperienceModuleId(moduleId) &&
        (isCesModuleEnabled(profile, moduleId) ||
          enabledPortalIds(profile).includes(moduleId));
      break;
    case "presentation": {
      const entitled = isCesModuleEnabled(profile, "executive-performance");
      const presentationOn = isExecutivePerformanceAvailable(
        profile.identity.clientSlug,
      );
      const briefingOn = isExecutiveClientBriefingAvailable(
        profile.identity.clientSlug,
      );
      baseVisible = entitled || presentationOn || briefingOn;
      break;
    }
    case "hq-default":
      baseVisible = hqDefaultVisible(profile, moduleId);
      break;
    default:
      baseVisible = false;
  }

  if (!baseVisible) return false;

  return applyPortalMemberReportsVisibility(moduleId, {
    clientSlug: profile.identity.clientSlug,
    portalUserEmail: ctx.portalMemberEmail,
    isOperatorPreview: ctx.isOperatorPreview,
  });
}

export function listVisiblePortalModuleIds(
  ctx: PortalModuleVisibilityContext,
): PortalModuleId[] {
  return listPortalCapabilityDefinitions()
    .map((def) => def.key)
    .filter((key): key is PortalModuleId => isPortalModuleVisible(key, ctx));
}
