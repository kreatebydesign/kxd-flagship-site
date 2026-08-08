/**
 * Pure Manage Client Experience composition.
 * Uses the same portal visibility + nav resolvers as the live portal.
 */

import {
  getCanonicalCapability,
  isCesExperienceModuleId,
  isInternalOnlyCapability,
  normalizeCesExperienceModuleList,
  normalizePortalModuleList,
  normalizeReportingCapabilityList,
  type PortalModuleId,
} from "@/lib/ces/modules/canonical";
import { resolvePortalHomeShell } from "@/lib/ces/modules/home";
import {
  isPortalModuleVisible,
  type PortalModuleVisibilityContext,
} from "@/lib/ces/modules/visibility";
import { getEnabledPortalNavGroups } from "@/lib/portal/nav";
import { getConfiguredEditionId } from "@/lib/editions/configuration";
import { isModuleEnabledForEdition } from "@/lib/editions/modules";
import { getEditionById } from "@/lib/editions/registry";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import {
  isOperatorToggleablePortalModule,
  listOperatorPortalModuleIds,
  operatorModuleDescription,
  operatorModuleKind,
  planAllowsPortalModule,
} from "./module-catalog";
import type {
  ExperienceProfileStatus,
  OperatorExperienceModuleRow,
  OperatorExperienceNavPreviewGroup,
  OperatorModuleEffectiveState,
} from "./types";

export type ExperienceComposeInput = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  profileStatus: ExperienceProfileStatus;
  selectedPortalModules: readonly string[];
  reportingCapabilities?: readonly string[];
  entitlements: {
    isLegacy: boolean;
    isPaused: boolean;
    effectiveModules: readonly string[];
  };
  billingNavAvailable: boolean;
  portfolioNavAvailable: boolean;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  visual?: Partial<ResolvedExperienceProfile["visual"]>;
  hospitality?: Partial<ResolvedExperienceProfile["hospitality"]>;
  terminology?: Record<string, string>;
};

function editionAllowsPortalModule(moduleId: PortalModuleId): boolean {
  const def = getCanonicalCapability(moduleId);
  if (!def?.editionModule) return true;
  const edition = getEditionById(getConfiguredEditionId());
  const hideIds = edition.customNavigation?.hidePortalNavIds ?? [];
  if (hideIds.includes(moduleId as never)) return false;
  return isModuleEnabledForEdition(def.editionModule, edition);
}

function applyPlanGate(
  selected: PortalModuleId[],
  reporting: string[],
  entitlements: ExperienceComposeInput["entitlements"],
): { portal: PortalModuleId[]; reporting: string[]; ces: PortalModuleId[] } {
  const portal = selected.filter((id) => {
    if (!isCesExperienceModuleId(id)) return true;
    return planAllowsPortalModule(id, entitlements);
  });
  const reportingKept = entitlements.isLegacy
    ? [...reporting]
    : reporting.filter((id) => entitlements.effectiveModules.includes(id));
  return {
    portal,
    reporting: reportingKept,
    ces: portal.filter((id) => isCesExperienceModuleId(id)),
  };
}

export function composeOperatorExperienceProfile(
  input: ExperienceComposeInput,
): ResolvedExperienceProfile {
  const selected = normalizePortalModuleList(input.selectedPortalModules).filter(
    (id) => !isInternalOnlyCapability(id) && id !== "advisor",
  );
  const reporting = normalizeReportingCapabilityList(input.reportingCapabilities ?? []);
  const gated = applyPlanGate(selected, reporting, input.entitlements);
  const active = input.profileStatus === "active";

  return {
    profileId: active ? 1 : null,
    source: active ? "profile" : "fallback",
    identity: {
      clientId: input.clientId,
      clientName: input.clientName,
      clientSlug: input.clientSlug,
      logoUrl: input.logoUrl ?? null,
      logoAlt: input.clientName,
      websiteUrl: input.websiteUrl ?? null,
    },
    visual: {
      primaryColor: input.visual?.primaryColor ?? "#0B0B0B",
      secondaryColor: input.visual?.secondaryColor ?? "#141414",
      accentColor: input.visual?.accentColor ?? "#C9A962",
      surfaceTint: input.visual?.surfaceTint ?? null,
      borderRadiusPreset: input.visual?.borderRadiusPreset ?? "default",
      motionPreset: input.visual?.motionPreset ?? "calm",
    },
    hospitality: {
      welcomeEyebrow: input.hospitality?.welcomeEyebrow ?? "Welcome",
      reassuranceLine:
        input.hospitality?.reassuranceLine ?? "You’re in good hands.",
      supportTone: input.hospitality?.supportTone ?? "warm-professional",
      portalSidebarLabel:
        input.hospitality?.portalSidebarLabel ?? input.clientName,
      partnerFooterLine:
        input.hospitality?.partnerFooterLine ?? "Powered by Kreate by Design",
      showPartnerMark: input.hospitality?.showPartnerMark !== false,
    },
    enabledModules: normalizeCesExperienceModuleList(gated.ces),
    enabledPortalModules: gated.portal,
    reportingCapabilities: normalizeReportingCapabilityList(gated.reporting),
    presentation: null,
    terminology: input.terminology ?? {},
    cssVars: {},
  };
}

function effectiveNote(
  id: PortalModuleId,
  effective: OperatorModuleEffectiveState,
  profileEnabled: boolean,
  profileStatus: ExperienceProfileStatus,
): string {
  if (effective === "not-available") {
    return id === "advisor"
      ? "Stub — fail-closed until a later phase."
      : "Not a client-facing portal module.";
  }
  if (effective === "ineligible") {
    return "Plan or edition does not allow this module.";
  }
  if (effective === "visible" && !profileEnabled && profileStatus !== "active") {
    return "Visible via generic Client HQ defaults (no active CES profile).";
  }
  if (effective === "visible" && !profileEnabled) {
    return "Visible from presentation, billing, or membership gates.";
  }
  if (effective === "hidden" && profileStatus === "active" && !profileEnabled) {
    return "Hidden — not on the active CES allowlist.";
  }
  if (effective === "hidden") return "Hidden for this client.";
  return "Visible in the client portal.";
}

export function composeOperatorModuleRows(
  input: ExperienceComposeInput,
): OperatorExperienceModuleRow[] {
  const profile = composeOperatorExperienceProfile(input);
  const ctx: PortalModuleVisibilityContext = {
    profile,
    billingNavAvailable: input.billingNavAvailable,
    portfolioNavAvailable: input.portfolioNavAvailable,
  };
  const selected = new Set(normalizePortalModuleList(input.selectedPortalModules));

  return listOperatorPortalModuleIds().map((id) => {
    const kind = operatorModuleKind(id);
    const planAllows = planAllowsPortalModule(id, input.entitlements);
    const editionAllows = editionAllowsPortalModule(id);
    const profileEnabled = selected.has(id);
    let effective: OperatorModuleEffectiveState;

    if (kind === "locked" || isInternalOnlyCapability(id)) {
      effective = "not-available";
    } else if (!editionAllows) {
      effective = "ineligible";
    } else if (isCesExperienceModuleId(id) && !planAllows) {
      effective = "ineligible";
    } else if (isPortalModuleVisible(id, ctx)) {
      effective = "visible";
    } else {
      effective = "hidden";
    }

    return {
      id,
      label: getCanonicalCapability(id)?.label ?? id,
      description: operatorModuleDescription(id),
      kind,
      profileEnabled,
      planAllows,
      editionAllows,
      effective,
      effectiveNote: effectiveNote(id, effective, profileEnabled, input.profileStatus),
    };
  });
}

export function composeOperatorNavPreview(
  input: ExperienceComposeInput,
): OperatorExperienceNavPreviewGroup[] {
  const profile = composeOperatorExperienceProfile(input);
  return getEnabledPortalNavGroups(profile, {
    billingNavAvailable: input.billingNavAvailable,
    portfolioNavAvailable: input.portfolioNavAvailable,
  }).map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      id: String(item.id),
      label: item.label,
      href: item.href,
    })),
  }));
}

export function composeOperatorHomeShell(
  input: ExperienceComposeInput,
): "ces" | "hq" {
  return resolvePortalHomeShell(composeOperatorExperienceProfile(input));
}

export function sanitizeSelectedPortalModules(
  values: readonly string[],
): PortalModuleId[] {
  return normalizePortalModuleList(values).filter(
    (id) => isOperatorToggleablePortalModule(id) && id !== "advisor",
  );
}
