import { getLaunchPackagePreset } from "../packages/presets";
import { persistableEntitlementIds, selectedModuleIds } from "../packages/resolve";
import { errorsOnly, validateLaunchReadiness } from "../validation/steps";
import type {
  LaunchReadinessCategory,
  LaunchReadinessReport,
  LaunchWizardDraftPayload,
} from "../types";

export function computeLaunchReadiness(
  payload: LaunchWizardDraftPayload,
  uniqueness?: {
    slugTakenByClient?: boolean;
    slugTakenByDraft?: boolean;
    nameTakenByClient?: boolean;
  },
): LaunchReadinessReport {
  const issues = validateLaunchReadiness(payload, uniqueness);
  const blockers = errorsOnly(issues).map((issue) => issue.message);
  const preset = getLaunchPackagePreset(payload.package.packageId);
  const modules = persistableEntitlementIds(payload.modules);
  const invited = payload.team.filter((m) => m.inviteOnLaunch);
  const savedOnly = payload.team.filter((m) => !m.inviteOnLaunch);

  const categories: LaunchReadinessCategory[] = [
    {
      id: "identity",
      label: "Identity",
      resolveStepId: "identity",
      state: payload.identity.businessName.trim() && payload.identity.clientSlug.trim()
        ? uniqueness?.slugTakenByClient || uniqueness?.nameTakenByClient
          ? "blocked"
          : "ready"
        : "awaiting-configuration",
      summary: payload.identity.businessName.trim() || "Business identity incomplete",
    },
    {
      id: "package",
      label: "Package",
      resolveStepId: "package",
      state: preset ? "ready" : "blocked",
      summary: preset?.catalogLabel ?? "No package selected",
    },
    {
      id: "experience",
      label: "Experience",
      resolveStepId: "experience",
      state: payload.experience.choiceId ? "ready" : "awaiting-configuration",
      summary:
        payload.experience.choiceId === "default"
          ? "Default Shared Core experience"
          : payload.experience.choiceId === "custom"
            ? "Custom experience path"
            : `Profile: ${payload.experience.choiceId}`,
    },
    {
      id: "modules",
      label: "Modules",
      resolveStepId: "modules",
      state: modules.length > 0 ? "ready" : "blocked",
      summary:
        modules.length > 0
          ? `${modules.length} entitlement${modules.length === 1 ? "" : "s"}`
          : "No modules selected",
      detail: modules.join(", "),
    },
    {
      id: "infrastructure",
      label: "Infrastructure",
      resolveStepId: "infrastructure",
      state:
        payload.infrastructure.searchConsoleIntention === "connected" ||
        payload.infrastructure.ga4Intention === "connected" ||
        payload.infrastructure.googleAdsIntention === "connected"
          ? "blocked"
          : payload.infrastructure.productionUrl.trim() ||
              payload.infrastructure.companyWebsite.trim()
            ? "ready"
            : "optional",
      summary:
        "Provider intentions recorded — not Connected until authorized after launch",
    },
    {
      id: "portal",
      label: "Portal",
      resolveStepId: "infrastructure",
      state: payload.infrastructure.portalReady ? "ready" : "awaiting-configuration",
      summary: payload.infrastructure.portalReady
        ? "Portal workspace will be prepared at launch"
        : "Portal preparation deferred",
    },
    {
      id: "team",
      label: "Team",
      resolveStepId: "team",
      state:
        payload.team.length === 0
          ? "optional"
          : invited.length > 0
            ? "ready"
            : "awaiting-configuration",
      summary:
        payload.team.length === 0
          ? "No portal users yet — can be added after launch"
          : `${invited.length} user record${invited.length === 1 ? "" : "s"} on launch · ${savedOnly.length} saved for later · email invitations not sent in this phase`,
    },
    {
      id: "reporting",
      label: "Reporting",
      resolveStepId: "modules",
      state:
        selectedModuleIds(payload.modules).some((id) =>
          ["seo", "website-analytics", "google-ads", "executive-reporting"].includes(id),
        )
          ? "awaiting-client"
          : "not-included",
      summary: selectedModuleIds(payload.modules).some((id) =>
        ["seo", "website-analytics", "google-ads"].includes(id),
      )
        ? "Entitled — authorization and facts ingest happen after launch"
        : "Reporting not entitled",
    },
    {
      id: "automation",
      label: "Automation",
      resolveStepId: "automation",
      state: payload.automation.reportingAutomationEnabled
        ? "ready"
        : "not-included",
      summary: payload.automation.reportingAutomationEnabled
        ? `Schedule configured for ${payload.automation.syncHourPacific}:00 Pacific (America/Los_Angeles) — inactive until launch`
        : "Reporting automation disabled",
    },
  ];

  const postLaunchFollowUps: string[] = [];
  if (payload.infrastructure.searchConsoleIntention === "requested") {
    postLaunchFollowUps.push("Authorize Search Console connection");
  }
  if (payload.infrastructure.ga4Intention === "requested") {
    postLaunchFollowUps.push("Authorize GA4 connection");
  }
  if (payload.infrastructure.googleAdsIntention === "requested") {
    postLaunchFollowUps.push("Authorize Google Ads connection");
  }
  for (const member of savedOnly) {
    postLaunchFollowUps.push(`Create portal access later for ${member.email}`);
  }
  if (invited.length > 0) {
    postLaunchFollowUps.push(
      "Portal user records will exist after launch — deliver access via password reset when invite email is available",
    );
  }

  const optionalEnhancements: string[] = [];
  if (!payload.experience.presentationSlug) {
    optionalEnhancements.push("Add presentation registry branding when ready");
  }
  if (payload.team.length === 0) {
    optionalEnhancements.push("Add additional portal seats after launch");
  }

  const willCreate = [
    "Client record",
    "Executive client profile",
    "CES experience profile with selected entitlements",
    "Client infrastructure record",
    "Launch timeline event",
  ];
  if (invited.length > 0) {
    willCreate.push(
      `${invited.length} portal user${invited.length === 1 ? "" : "s"} (access created; invite email not sent in Phase 34A)`,
    );
  }
  if (payload.automation.reportingAutomationEnabled) {
    willCreate.push("Reporting automation schedule on infrastructure");
  }

  return {
    categories,
    blockers,
    postLaunchFollowUps,
    optionalEnhancements,
    willCreate,
    canLaunch: blockers.length === 0,
  };
}
