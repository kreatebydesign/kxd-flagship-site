import { getLaunchPackagePreset } from "../packages/presets";
import { persistableEntitlementIds } from "../packages/resolve";
import { launchModuleLabel } from "../modules/catalog";
import { formatReportingSyncHourPacificLabel } from "@/lib/reporting/operations/sync-hour";
import type { LaunchWizardDraftPayload } from "../types";

export type LaunchConfirmationSummary = {
  businessName: string;
  packageLabel: string;
  portalUsersToCreate: number;
  invitationsWillBeSent: false;
  invitationStatusLabel: string;
  modulesEnabled: string[];
  automationEnabled: boolean;
  syncHourLabel: string | null;
  integrationsAwaitingAuthorization: string[];
  createsRecords: string[];
};

export function buildLaunchConfirmationSummary(
  payload: LaunchWizardDraftPayload,
): LaunchConfirmationSummary {
  const preset = getLaunchPackagePreset(payload.package.packageId);
  const inviteOnLaunch = payload.team.filter((member) => member.inviteOnLaunch);
  const modules = persistableEntitlementIds(payload.modules).map(launchModuleLabel);
  const awaiting: string[] = [];
  if (
    payload.infrastructure.searchConsoleIntention === "requested" ||
    payload.infrastructure.searchConsoleIntention === "needs-authorization" ||
    payload.infrastructure.searchConsoleIntention === "awaiting-client"
  ) {
    awaiting.push("Search Console");
  }
  if (
    payload.infrastructure.ga4Intention === "requested" ||
    payload.infrastructure.ga4Intention === "needs-authorization" ||
    payload.infrastructure.ga4Intention === "awaiting-client"
  ) {
    awaiting.push("GA4");
  }
  if (
    payload.infrastructure.googleAdsIntention === "requested" ||
    payload.infrastructure.googleAdsIntention === "needs-authorization" ||
    payload.infrastructure.googleAdsIntention === "awaiting-client"
  ) {
    awaiting.push("Google Ads");
  }

  return {
    businessName: payload.identity.businessName.trim() || "Untitled client",
    packageLabel: preset?.catalogLabel ?? payload.package.packageId,
    portalUsersToCreate: inviteOnLaunch.length,
    invitationsWillBeSent: false,
    invitationStatusLabel:
      inviteOnLaunch.length > 0
        ? "Portal user records will be created. Email invitations are not sent in this phase — credentials are not displayed."
        : "No portal users will be created on launch.",
    modulesEnabled: modules,
    automationEnabled: payload.automation.reportingAutomationEnabled,
    syncHourLabel: payload.automation.reportingAutomationEnabled
      ? formatReportingSyncHourPacificLabel(payload.automation.syncHourPacific)
      : null,
    integrationsAwaitingAuthorization: awaiting,
    createsRecords: [
      "Client record",
      "Executive client profile",
      "CES experience profile with selected entitlements",
      "Client infrastructure record",
      "Launch timeline event",
      ...(inviteOnLaunch.length
        ? [`${inviteOnLaunch.length} portal user record${inviteOnLaunch.length === 1 ? "" : "s"}`]
        : []),
    ],
  };
}
