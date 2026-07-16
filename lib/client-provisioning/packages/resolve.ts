/**
 * Package → module entitlement resolution.
 * Reuses Launch Wizard commercial presets — does not hardcode feature lists twice.
 */

import {
  getLaunchPackagePreset,
  listLaunchPackagePresets,
} from "@/lib/client-launch-wizard/packages/presets";
import type { LaunchPackageId } from "@/lib/client-launch-wizard/types";
import { PROVISIONING_MODULE_CATALOG } from "../modules/catalog";
import type {
  ProvisioningModuleSelection,
  ProvisioningPackageId,
} from "../types";

const PACKAGE_MODULE_HINTS: Record<ProvisioningPackageId, string[]> = {
  starter: [
    "executive-workspace",
    "client-portal",
    "website-review",
    "visual-review",
    "launch-wizard",
  ],
  growth: [
    "executive-workspace",
    "client-portal",
    "website-review",
    "website-workspace",
    "visual-review",
    "reporting",
    "google-integrations",
    "launch-wizard",
    "morning-brief",
  ],
  premium: [
    "executive-workspace",
    "client-portal",
    "website-review",
    "website-workspace",
    "visual-review",
    "inventory",
    "public-showroom",
    "reporting",
    "executive-intelligence",
    "google-integrations",
    "launch-wizard",
    "morning-brief",
    "focus-mode",
  ],
  enterprise: [
    "executive-workspace",
    "client-portal",
    "website-review",
    "website-workspace",
    "visual-review",
    "inventory",
    "public-showroom",
    "reporting",
    "executive-intelligence",
    "google-integrations",
    "launch-wizard",
    "morning-brief",
    "focus-mode",
  ],
  custom: [],
};

export function listProvisioningPackages() {
  return listLaunchPackagePresets().map((preset) => ({
    id: preset.id as ProvisioningPackageId,
    label: preset.catalogLabel,
    description: preset.description,
    intendedFit: preset.intendedFit,
    reportingLevel: preset.reportingLevel,
    portalLevel: preset.portalLevel,
    executiveLevel: preset.executiveLevel,
  }));
}

export function getProvisioningPackage(id: ProvisioningPackageId) {
  return listProvisioningPackages().find((row) => row.id === id) ?? null;
}

export function resolveModulesForPackage(
  packageId: ProvisioningPackageId,
  prior?: ProvisioningModuleSelection[],
): ProvisioningModuleSelection[] {
  const priorMap = new Map((prior ?? []).map((row) => [row.moduleId, row.enabled]));
  const hinted = new Set(PACKAGE_MODULE_HINTS[packageId] ?? []);
  const launchPreset = getLaunchPackagePreset(packageId as LaunchPackageId);
  const launchIncluded = new Set(launchPreset?.includedModules ?? []);

  return PROVISIONING_MODULE_CATALOG.map((mod) => {
    if (packageId === "custom") {
      return {
        moduleId: mod.id,
        enabled: priorMap.get(mod.id) ?? false,
      };
    }

    // Prefer explicit prior override when present.
    if (priorMap.has(mod.id)) {
      return { moduleId: mod.id, enabled: Boolean(priorMap.get(mod.id)) };
    }

    const fromHint = hinted.has(mod.id);
    const fromLaunchEntitlement = mod.entitlementIds.some((id) =>
      launchIncluded.has(id as never),
    );
    return {
      moduleId: mod.id,
      enabled: fromHint || fromLaunchEntitlement,
    };
  });
}

/** Persistable Shared Core entitlement IDs from enabled modules (skips planned-only). */
export function resolvePersistableEntitlements(
  modules: readonly ProvisioningModuleSelection[],
): string[] {
  const enabled = new Set(
    modules.filter((row) => row.enabled).map((row) => row.moduleId),
  );
  const ids = new Set<string>();

  for (const mod of PROVISIONING_MODULE_CATALOG) {
    if (!enabled.has(mod.id) || mod.planned) continue;
    for (const entitlementId of mod.entitlementIds) {
      ids.add(entitlementId);
    }
  }

  return [...ids];
}

export function resolveCesModules(
  entitlements: readonly string[],
): Array<"website-review" | "website-workspace" | "executive-performance" | "inventory"> {
  const allowed = new Set([
    "website-review",
    "website-workspace",
    "executive-performance",
    "inventory",
  ]);
  return entitlements.filter((id): id is
    | "website-review"
    | "website-workspace"
    | "executive-performance"
    | "inventory" => allowed.has(id));
}
