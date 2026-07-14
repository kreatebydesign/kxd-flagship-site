import {
  isKnownLaunchModuleId,
  moduleAvailabilityForPackage,
  rejectUnknownLaunchModules,
  selectedModuleIds,
} from "../packages/resolve";
import type {
  LaunchPackageId,
  LaunchWizardModuleSelection,
  LaunchWizardValidationIssue,
} from "../types";
import { LAUNCH_WIZARD_COMING_SOON_IDS } from "../constants";

export function validateModulesStep(
  packageId: LaunchPackageId,
  modules: readonly LaunchWizardModuleSelection[],
): LaunchWizardValidationIssue[] {
  const issues: LaunchWizardValidationIssue[] = [];
  const unknown = rejectUnknownLaunchModules(modules.map((row) => row.moduleId));
  for (const id of unknown) {
    issues.push({
      stepId: "modules",
      field: id,
      code: "modules.unknown",
      message: `Unknown module "${id}" — only Shared Core registry modules are allowed.`,
      level: "error",
    });
  }

  for (const row of modules) {
    if (!isKnownLaunchModuleId(row.moduleId)) continue;
    const availability = moduleAvailabilityForPackage(packageId, row.moduleId);
    if (row.selected && availability === "unavailable") {
      issues.push({
        stepId: "modules",
        field: row.moduleId,
        code: "modules.unavailable",
        message: `Module "${row.moduleId}" is not available for this package.`,
        level: "error",
      });
    }
    if (
      row.selected &&
      availability === "coming-soon" &&
      (LAUNCH_WIZARD_COMING_SOON_IDS as readonly string[]).includes(row.moduleId)
    ) {
      issues.push({
        stepId: "modules",
        field: row.moduleId,
        code: "modules.comingSoonSelected",
        message: `"${row.moduleId}" is on the roadmap and cannot be enabled at launch.`,
        level: "error",
      });
    }
  }

  const selected = selectedModuleIds(modules);
  if (packageId !== "custom" && selected.length === 0) {
    issues.push({
      stepId: "modules",
      code: "modules.empty",
      message: "At least one included module must remain selected.",
      level: "error",
    });
  }

  if (packageId === "custom" && selected.length === 0) {
    issues.push({
      stepId: "modules",
      code: "modules.customEmpty",
      message: "Custom packages require at least one module selection.",
      level: "error",
    });
  }

  if (
    selected.includes("executive-reporting") &&
    !selected.some((id) =>
      id === "seo" || id === "website-analytics" || id === "google-ads",
    )
  ) {
    issues.push({
      stepId: "modules",
      field: "executive-reporting",
      code: "modules.dependency.executiveReporting",
      message:
        "Executive Reporting requires at least one reporting source module (SEO, Website Analytics, or Google Ads).",
      level: "error",
    });
  }

  return issues;
}
