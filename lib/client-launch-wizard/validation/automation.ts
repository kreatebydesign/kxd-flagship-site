import { parseStrictReportingSyncHourPacific } from "@/lib/reporting/operations/sync-hour";
import type { LaunchWizardAutomation, LaunchWizardValidationIssue } from "../types";

const PROVIDERS = new Set(["search-console", "ga4", "ads"]);

export function validateAutomationStep(
  automation: LaunchWizardAutomation,
): LaunchWizardValidationIssue[] {
  const issues: LaunchWizardValidationIssue[] = [];
  const hour = parseStrictReportingSyncHourPacific(automation.syncHourPacific);
  if (!hour.ok) {
    issues.push({
      stepId: "automation",
      field: "syncHourPacific",
      code: "automation.syncHour.invalid",
      message: hour.error,
      level: "error",
    });
  }

  for (const provider of automation.entitledProviders) {
    if (!PROVIDERS.has(provider)) {
      issues.push({
        stepId: "automation",
        field: provider,
        code: "automation.provider.unknown",
        message: `Unknown reporting provider "${provider}".`,
        level: "error",
      });
    }
  }

  if (
    automation.reportingAutomationEnabled &&
    automation.entitledProviders.length === 0
  ) {
    issues.push({
      stepId: "automation",
      code: "automation.providers.empty",
      message:
        "Enable at least one entitled provider, or disable reporting automation.",
      level: "error",
    });
  }

  return issues;
}
