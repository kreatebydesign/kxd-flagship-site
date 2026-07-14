import { emptyLaunchWizardPayload } from "./empty";
import { resolvePackageModuleSelections } from "../packages/resolve";
import type {
  LaunchDraftStatus,
  LaunchWizardDraftPayload,
  LaunchWizardStepId,
} from "../types";
import { LAUNCH_WIZARD_STEPS } from "../constants";

const STEP_IDS = new Set(LAUNCH_WIZARD_STEPS.map((s) => s.id));
const STATUSES = new Set<LaunchDraftStatus>([
  "draft",
  "ready",
  "launching",
  "launched",
  "failed",
  "abandoned",
]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function isLaunchWizardStepId(value: unknown): value is LaunchWizardStepId {
  return typeof value === "string" && STEP_IDS.has(value as LaunchWizardStepId);
}

export function isLaunchDraftStatus(value: unknown): value is LaunchDraftStatus {
  return typeof value === "string" && STATUSES.has(value as LaunchDraftStatus);
}

/** Normalize unknown JSON into a safe draft payload (no secrets retained). */
export function normalizeLaunchWizardPayload(raw: unknown): LaunchWizardDraftPayload {
  const base = emptyLaunchWizardPayload();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  const identity = (src.identity ?? {}) as Record<string, unknown>;
  const pkg = (src.package ?? {}) as Record<string, unknown>;
  const experience = (src.experience ?? {}) as Record<string, unknown>;
  const infrastructure = (src.infrastructure ?? {}) as Record<string, unknown>;
  const automation = (src.automation ?? {}) as Record<string, unknown>;

  const packageId =
    typeof pkg.packageId === "string" ? pkg.packageId : base.package.packageId;

  const modulesRaw = Array.isArray(src.modules) ? src.modules : [];
  const modules: LaunchWizardDraftPayload["modules"] =
    modulesRaw.length > 0
      ? modulesRaw
          .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
          .map((row) => {
            const source =
              row.source === "optional" ||
              row.source === "custom-override" ||
              row.source === "package-default"
                ? row.source
                : ("custom-override" as const);
            return {
              moduleId: asString(
                row.moduleId,
              ) as LaunchWizardDraftPayload["modules"][number]["moduleId"],
              selected: asBool(row.selected),
              source,
            };
          })
      : resolvePackageModuleSelections(
          packageId as LaunchWizardDraftPayload["package"]["packageId"],
        );

  const team: LaunchWizardDraftPayload["team"] = Array.isArray(src.team)
    ? src.team
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((row, index) => {
          const role =
            row.role === "owner" || row.role === "collaborator" || row.role === "viewer"
              ? row.role
              : ("collaborator" as const);
          return {
            id: asString(row.id, `member-${index + 1}`),
            name: asString(row.name),
            email: asString(row.email),
            role,
            isPrimaryContact: asBool(row.isPrimaryContact),
            inviteOnLaunch: asBool(row.inviteOnLaunch),
          };
        })
    : [];

  const entitledProviders = Array.isArray(automation.entitledProviders)
    ? automation.entitledProviders.filter(
        (p): p is "search-console" | "ga4" | "ads" =>
          p === "search-console" || p === "ga4" || p === "ads",
      )
    : [];

  return {
    identity: {
      businessName: asString(identity.businessName),
      clientSlug: asString(identity.clientSlug),
      primaryContactName: asString(identity.primaryContactName),
      primaryContactEmail: asString(identity.primaryContactEmail),
      phone: asString(identity.phone),
      companyWebsite: asString(identity.companyWebsite),
      industry: asString(identity.industry),
      serviceRegion: asString(identity.serviceRegion),
      internalNotes: asString(identity.internalNotes),
    },
    package: {
      packageId: packageId as LaunchWizardDraftPayload["package"]["packageId"],
      displayName: asString(pkg.displayName),
    },
    experience: {
      choiceId: asString(experience.choiceId, "default"),
      presentationSlug:
        typeof experience.presentationSlug === "string"
          ? experience.presentationSlug
          : null,
      notes: asString(experience.notes),
    },
    modules,
    infrastructure: {
      companyWebsite: asString(infrastructure.companyWebsite),
      productionUrl: asString(infrastructure.productionUrl),
      stagingUrl: asString(infrastructure.stagingUrl),
      searchConsoleSiteUrl: asString(infrastructure.searchConsoleSiteUrl),
      ga4PropertyId: asString(infrastructure.ga4PropertyId),
      googleAdsCustomerId: asString(infrastructure.googleAdsCustomerId),
      searchConsoleIntention:
        (asString(
          infrastructure.searchConsoleIntention,
          "not-included",
        ) as LaunchWizardDraftPayload["infrastructure"]["searchConsoleIntention"]) ||
        "not-included",
      ga4Intention:
        (asString(
          infrastructure.ga4Intention,
          "not-included",
        ) as LaunchWizardDraftPayload["infrastructure"]["ga4Intention"]) ||
        "not-included",
      googleAdsIntention:
        (asString(
          infrastructure.googleAdsIntention,
          "not-included",
        ) as LaunchWizardDraftPayload["infrastructure"]["googleAdsIntention"]) ||
        "not-included",
      portalReady: asBool(infrastructure.portalReady, true),
      notes: asString(infrastructure.notes),
    },
    team,
    automation: {
      reportingAutomationEnabled: asBool(automation.reportingAutomationEnabled),
      syncHourPacific: asNumber(automation.syncHourPacific, 5),
      entitledProviders,
      executiveBriefingPreferred: asBool(automation.executiveBriefingPreferred),
    },
  };
}
