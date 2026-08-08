import { isCesExperienceModuleId } from "@/lib/ces/modules/canonical";
import type {
  OperatorExperienceWarning,
  OperatorIntegrationStatusRow,
} from "./types";

export type ExperienceWarningInput = {
  hasLogo: boolean;
  profileStatus: "none" | "draft" | "active" | "archived";
  selectedPortalModules: readonly string[];
  welcomeEyebrow: string;
  reassuranceLine: string;
  accentColor: string;
  hasPortalMembership: boolean;
  inventoryRecordCount: number;
  integrations: readonly OperatorIntegrationStatusRow[];
};

export function composeOperatorExperienceWarnings(
  input: ExperienceWarningInput,
): OperatorExperienceWarning[] {
  const warnings: OperatorExperienceWarning[] = [];

  if (input.profileStatus !== "active") {
    warnings.push({
      id: "no-active-profile",
      message:
        "No active Client Experience Profile — the live portal uses generic Client HQ defaults.",
    });
  }

  if (!input.hasLogo) {
    warnings.push({
      id: "no-logo",
      message: "No client logo on file. Add a logo override or onboarding logo.",
    });
  }

  const useful = input.selectedPortalModules.filter(
    (id) =>
      isCesExperienceModuleId(id) ||
      id === "projects" ||
      id === "analytics" ||
      id === "reports" ||
      id === "website-health" ||
      id === "requests" ||
      id === "deliverables",
  );
  if (input.profileStatus === "active" && useful.length === 0) {
    warnings.push({
      id: "no-useful-modules",
      message:
        "Active CES profile has no useful modules enabled. The client will see a narrow allowlist.",
    });
  }

  if (
    !input.welcomeEyebrow.trim() ||
    !input.reassuranceLine.trim() ||
    !input.accentColor.trim()
  ) {
    warnings.push({
      id: "incomplete-branding",
      message: "Branding is incomplete — welcome copy or accent color is empty.",
    });
  }

  const reportingModuleOn = input.selectedPortalModules.some((id) =>
    id === "analytics" || id === "reports" || id === "website-health",
  );
  const reportingConnected = input.integrations.some(
    (row) =>
      (row.id === "ga4" || row.id === "search-console") && row.status === "configured",
  );
  if (reportingModuleOn && !reportingConnected) {
    warnings.push({
      id: "reporting-without-connection",
      message:
        "Analytics, Reports, or Website Health is enabled but no GA4 or Search Console connection is configured.",
    });
  }

  if (
    input.selectedPortalModules.includes("inventory") &&
    input.inventoryRecordCount === 0
  ) {
    warnings.push({
      id: "inventory-without-data",
      message: "Inventory is enabled but no listings exist yet.",
    });
  }

  if (!input.hasPortalMembership) {
    warnings.push({
      id: "no-portal-membership",
      message:
        "No portal membership yet. Use Manage Portal Access when ready to invite — do not invite from this screen.",
    });
  }

  return warnings;
}
