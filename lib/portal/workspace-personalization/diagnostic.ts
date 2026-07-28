/**
 * Read-only personalization diagnostic for admin operators.
 * Does not write client records and does not imply DB-backed personalization.
 */

import type { CesModuleId, ResolvedExperienceProfile } from "@/lib/ces";
import { resolveWorkspacePersonalization } from "./resolve";
import type { WorkspacePersonalizationModel } from "./types";

const CES_MODULE_IDS = new Set<CesModuleId>([
  "website-review",
  "website-workspace",
  "executive-performance",
  "executive-review",
  "inventory",
]);

export type WorkspacePersonalizationDiagnostic = {
  /** Explicit note for operators — configuration is code-owned / derived. */
  notice: string;
  profileKey: WorkspacePersonalizationModel["profileKey"];
  source: WorkspacePersonalizationModel["source"];
  fallbackApplied: boolean;
  enabledModuleKeys: string[];
  primaryActionLabels: string[];
  terminologyOverrides: Record<string, string>;
  warnings: string[];
};

function buildSyntheticExperienceProfile(input: {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  cesModules: string[];
  accentColor: string | null;
}): ResolvedExperienceProfile {
  const enabledModules = input.cesModules.filter((m): m is CesModuleId =>
    CES_MODULE_IDS.has(m as CesModuleId),
  );

  return {
    profileId: null,
    source: "fallback",
    identity: {
      clientId: input.clientId,
      clientName: input.clientName,
      clientSlug: input.clientSlug,
      logoUrl: null,
      logoAlt: input.clientName,
      websiteUrl: null,
    },
    visual: {
      primaryColor: "#111111",
      secondaryColor: "#333333",
      accentColor: input.accentColor ?? "#111111",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Your workspace",
      reassuranceLine: "A calm partnership workspace.",
      supportTone: "warm-professional",
      portalSidebarLabel: "Your workspace",
      partnerFooterLine: "Powered by KXD OS",
      showPartnerMark: true,
    },
    enabledModules,
    reportingCapabilities: [],
    presentation: null,
    terminology: {},
    cssVars: {},
  };
}

export function diagnoseWorkspacePersonalization(input: {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  cesModules: string[];
  accentColor: string | null;
}): WorkspacePersonalizationDiagnostic {
  const profile = buildSyntheticExperienceProfile(input);
  const model = resolveWorkspacePersonalization({
    authorizedClientId: input.clientId,
    experienceProfile: profile,
  });

  const warnings: string[] = [];
  if (model.fallbackApplied) {
    warnings.push("Using neutral KXD default personalization (no explicit profile match).");
  }
  if (!input.clientSlug) {
    warnings.push("Client has no slug — explicit code-owned profiles cannot match.");
  }
  if (model.primaryActions.length === 0) {
    warnings.push("No primary actions available from current entitlements.");
  }

  return {
    notice:
      "Preview only — workspace personalization is code-owned and derived. This screen does not save personalization to the database.",
    profileKey: model.profileKey,
    source: model.source,
    fallbackApplied: model.fallbackApplied,
    enabledModuleKeys: model.priorityModules.map((m) => m.key),
    primaryActionLabels: model.primaryActions.map((a) => a.label),
    terminologyOverrides: Object.fromEntries(
      Object.entries(model.terminology).filter(
        ([, v]) => typeof v === "string" && v.length > 0,
      ),
    ),
    warnings,
  };
}
