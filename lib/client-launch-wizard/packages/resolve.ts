import { ALL_REPORTING_CAPABILITIES } from "@/lib/reporting/domain/capabilities";
import { LAUNCH_WIZARD_COMING_SOON_IDS, LAUNCH_WIZARD_KNOWN_CES_MODULES } from "../constants";
import type {
  LaunchPackageId,
  LaunchWizardModuleId,
  LaunchWizardModuleSelection,
  LaunchModuleAvailability,
} from "../types";
import { getLaunchPackagePreset } from "./presets";

const KNOWN_MODULE_IDS = new Set<string>([
  ...LAUNCH_WIZARD_KNOWN_CES_MODULES,
  ...ALL_REPORTING_CAPABILITIES,
  ...LAUNCH_WIZARD_COMING_SOON_IDS,
]);

export function isKnownLaunchModuleId(moduleId: string): moduleId is LaunchWizardModuleId {
  return KNOWN_MODULE_IDS.has(moduleId);
}

export function rejectUnknownLaunchModules(moduleIds: readonly string[]): string[] {
  return moduleIds.filter((id) => !isKnownLaunchModuleId(id));
}

export function moduleAvailabilityForPackage(
  packageId: LaunchPackageId,
  moduleId: LaunchWizardModuleId,
): LaunchModuleAvailability {
  const preset = getLaunchPackagePreset(packageId);
  if (!preset) return "unavailable";

  if ((LAUNCH_WIZARD_COMING_SOON_IDS as readonly string[]).includes(moduleId)) {
    if (preset.optionalModules.includes(moduleId) || preset.includedModules.includes(moduleId)) {
      return "coming-soon";
    }
    return "unavailable";
  }

  if (preset.includedModules.includes(moduleId)) return "included";
  if (preset.optionalModules.includes(moduleId)) return "optional";
  if (packageId === "custom" && isKnownLaunchModuleId(moduleId)) return "optional";
  return "unavailable";
}

/** Resolve package defaults into draft module rows. Custom packages start empty. */
export function resolvePackageModuleSelections(
  packageId: LaunchPackageId,
  prior?: LaunchWizardModuleSelection[],
): LaunchWizardModuleSelection[] {
  const preset = getLaunchPackagePreset(packageId);
  if (!preset) return [];

  if (packageId === "custom") {
    const priorMap = new Map((prior ?? []).map((row) => [row.moduleId, row]));
    const catalog = [
      ...LAUNCH_WIZARD_KNOWN_CES_MODULES,
      ...ALL_REPORTING_CAPABILITIES,
    ] as LaunchWizardModuleId[];
    return catalog.map((moduleId) => {
      const existing = priorMap.get(moduleId);
      return {
        moduleId,
        selected: existing?.selected ?? false,
        source: "custom-override" as const,
      };
    });
  }

  const included = new Set(preset.includedModules);
  const optional = new Set(preset.optionalModules);
  const priorMap = new Map((prior ?? []).map((row) => [row.moduleId, row]));
  const ids = [...new Set([...preset.includedModules, ...preset.optionalModules])];

  return ids.map((moduleId) => {
    const existing = priorMap.get(moduleId);
    if (included.has(moduleId)) {
      return {
        moduleId,
        selected: true,
        source: "package-default" as const,
      };
    }
    return {
      moduleId,
      selected: existing?.selected ?? false,
      source: optional.has(moduleId) ? ("optional" as const) : ("custom-override" as const),
    };
  });
}

export function selectedModuleIds(
  modules: readonly LaunchWizardModuleSelection[],
): LaunchWizardModuleId[] {
  return modules.filter((row) => row.selected).map((row) => row.moduleId);
}

/** Modules that can be persisted onto experience profiles today. */
export function persistableEntitlementIds(
  modules: readonly LaunchWizardModuleSelection[],
): string[] {
  const comingSoon = new Set<string>(LAUNCH_WIZARD_COMING_SOON_IDS);
  return selectedModuleIds(modules).filter((id) => !comingSoon.has(id));
}
