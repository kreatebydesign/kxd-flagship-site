/**
 * Client Experience readiness + provisioning classification.
 * Pure. Does not write. Does not invite. Client-agnostic.
 */

import { normalizeGa4PropertyId } from "@/lib/reporting/providers/connection-resolve";
import type { PortalModuleId } from "@/lib/ces/modules/canonical";
import type {
  ExperienceBrandingRecommendation,
  ExperienceDependency,
  ExperienceModuleRecommendation,
  ExperienceProvisionAction,
  ExperienceReadiness,
  ExperienceSignals,
} from "./types";

const KXD_GOLD = "#C9A962";

function noneProvision(): ExperienceProvisionAction {
  return { kind: "none", label: "", href: null, actionId: null, discoverKind: null };
}

export function isKxdGoldHex(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().toUpperCase() === KXD_GOLD);
}

export function hostnameFromWebsite(
  websiteUrl: string | null | undefined,
  primaryDomain: string | null | undefined,
): string | null {
  const domain = primaryDomain?.trim().replace(/^https?:\/\//i, "").split("/")[0];
  if (domain) return domain.replace(/^www\./i, "").toLowerCase() || null;
  const raw = websiteUrl?.trim();
  if (!raw) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/** Propose a Search Console property identifier from known OS website/domain truth. */
export function proposeSearchConsoleSiteUrl(
  websiteUrl: string | null | undefined,
  primaryDomain: string | null | undefined,
): string | null {
  const host = hostnameFromWebsite(websiteUrl, primaryDomain);
  return host ? `sc-domain:${host}` : null;
}

/** Extract a numeric GA4 property ID from reporting evidence — never a G- measurement ID. */
export function extractGa4PropertyIdFromEvidence(refs: unknown): string | null {
  const values: string[] = [];
  if (Array.isArray(refs)) {
    for (const item of refs) values.push(String(item));
  } else if (typeof refs === "string") {
    values.push(refs);
  } else if (refs && typeof refs === "object") {
    values.push(JSON.stringify(refs));
  }
  for (const value of values) {
    const match = value.match(/ga4:property:(\d{4,})/i) || value.match(/properties\/(\d{4,})/i);
    if (match?.[1]) {
      const normalized = normalizeGa4PropertyId(match[1]);
      if (normalized) return normalized;
    }
  }
  return null;
}

export function isTrustedClientAccent(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || !trimmed.startsWith("#")) return false;
  return !isKxdGoldHex(trimmed);
}

function moduleById(
  modules: readonly ExperienceModuleRecommendation[],
  id: PortalModuleId,
): ExperienceModuleRecommendation | undefined {
  return modules.find((row) => row.id === id);
}

function isRelevant(
  row: ExperienceModuleRecommendation | undefined,
): row is ExperienceModuleRecommendation {
  return Boolean(row && (row.decision === "include" || row.decision === "needs-setup"));
}

export function composeExperienceReadiness(input: {
  signals: ExperienceSignals;
  branding: ExperienceBrandingRecommendation;
  modules: readonly ExperienceModuleRecommendation[];
  acceptedModules: readonly string[];
}): ExperienceReadiness {
  const { signals, branding, modules } = input;
  const accepted = new Set(input.acceptedModules);
  const hrefs = signals.ownerHrefs;
  const dependencies: ExperienceDependency[] = [];

  const logoSatisfied = branding.logoHasFile;
  dependencies.push({
    id: "logo",
    label: "Logo",
    status: logoSatisfied ? "satisfied" : "unresolved",
    resolutionClass: logoSatisfied ? "satisfied" : "external",
    launchImpact: "blocking",
    reason: logoSatisfied
      ? branding.logoNote
      : "No client logo in the experience profile, onboarding files, or presentation registry. A live marketing site logo is not CES-canonical until it is stored in KXD OS.",
    ownerSystem: "Client Onboarding / CES profile logo",
    ownerHref: signals.logoSource === "onboarding" ? hrefs.onboarding : hrefs.onboardingCreate,
    relatedModules: [],
    discoveredValue: null,
    provision: logoSatisfied
      ? noneProvision()
      : {
          kind: "discover",
          label: "Discover From Managed Website",
          href: hrefs.onboarding !== hrefs.onboardingCreate ? hrefs.onboarding : hrefs.onboardingCreate,
          actionId: null,
          discoverKind: "branding",
        },
  });

  const colorsSatisfied = branding.colorSource === "authoritative";
  dependencies.push({
    id: "brand-colors",
    label: "Brand colors",
    status: colorsSatisfied ? "satisfied" : "unresolved",
    resolutionClass: colorsSatisfied
      ? "satisfied"
      : signals.brandKit && isTrustedClientAccent(signals.brandKit.accentColor)
        ? "auto-resolvable"
        : "actionable",
    launchImpact: "blocking",
    reason: colorsSatisfied
      ? branding.colorNote
      : signals.brandKit && isTrustedClientAccent(signals.brandKit.accentColor)
        ? "Brand kit colors exist and will be used — they were not copied into the experience profile."
        : "No trusted client brand color is stored. KXD gold is never used as a client brand. Conservative charcoal is a fallback only.",
    ownerSystem: "Brand kit / CES profile",
    ownerHref: signals.brandKit?.href ?? hrefs.brandKitCreate,
    relatedModules: [],
    discoveredValue:
      signals.brandKit && isTrustedClientAccent(signals.brandKit.accentColor)
        ? signals.brandKit.accentColor
        : null,
    provision: colorsSatisfied
      ? noneProvision()
      : {
          kind: "discover",
          label: "Discover From Managed Website",
          href: signals.brandKit?.href ?? hrefs.brandKitCreate,
          actionId: null,
          discoverKind: "branding",
        },
  });

  const websiteSatisfied = Boolean(signals.websiteUrl || signals.primaryDomain);
  dependencies.push({
    id: "website",
    label: "Website / domain",
    status: websiteSatisfied ? "satisfied" : "unresolved",
    resolutionClass: websiteSatisfied ? "satisfied" : "actionable",
    launchImpact: "optional",
    reason: websiteSatisfied
      ? `Website / domain on file (${signals.websiteUrl || signals.primaryDomain}).`
      : "No company website or primary domain on the client / infrastructure record.",
    ownerSystem: "Client record + Client Infrastructure",
    ownerHref: hrefs.infrastructure,
    relatedModules: ["website-review", "website-workspace", "website-health", "analytics"],
    discoveredValue: signals.websiteUrl || signals.primaryDomain,
    provision: websiteSatisfied
      ? noneProvision()
      : {
          kind: "navigate",
          label: "Open infrastructure",
          href: hrefs.infrastructure,
          actionId: null,
          discoverKind: null,
        },
  });

  const analytics = moduleById(modules, "analytics");
  if (isRelevant(analytics)) {
    const ga4Ready = Boolean(signals.ga4PropertyId);
    const discovered = signals.discoveredGa4PropertyId;
    const execHint = signals.executiveAnalyticsStatus?.trim();
    let reason: string;
    let resolutionClass: ExperienceDependency["resolutionClass"];
    let provision: ExperienceProvisionAction;
    if (ga4Ready) {
      reason = `GA4 property ${signals.ga4PropertyId} is stored on Client Infrastructure.`;
      resolutionClass = "satisfied";
      provision = noneProvision();
    } else if (discovered) {
      reason = `A numeric GA4 property (${discovered}) already exists in reporting facts but is not stored on Client Infrastructure.`;
      resolutionClass = "auto-resolvable";
      provision = {
        kind: "apply-discovered",
        label: `Apply GA4 property ${discovered} to infrastructure`,
        href: hrefs.infrastructureEdit ?? hrefs.infrastructure,
        actionId: "apply-discovered-ga4-property",
        discoverKind: null,
      };
    } else {
      reason = [
        "Analytics is appropriate, but no GA4 property ID is stored on Client Infrastructure.",
        "KXD OS can list accessible GA4 properties through the connected Google Reporting identity and match them to this client's managed website.",
        "A website measurement ID (G-XXXX) is not a GA4 property ID and cannot be used for reporting ingest.",
        execHint
          ? `Executive profile notes analytics as “${execHint}” — that narrative is not a connection.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");
      resolutionClass = "actionable";
      provision = {
        kind: "discover",
        label: "Discover Google Analytics Property",
        href: hrefs.infrastructureEdit ?? hrefs.infrastructure,
        actionId: null,
        discoverKind: "ga4",
      };
    }
    dependencies.push({
      id: "ga4",
      label: "Analytics (GA4)",
      status: ga4Ready ? "satisfied" : "unresolved",
      resolutionClass,
      launchImpact: "blocking",
      reason,
      ownerSystem: "Client Infrastructure",
      ownerHref: hrefs.infrastructureEdit ?? hrefs.infrastructure,
      relatedModules: ["analytics", "website-health"],
      discoveredValue: signals.ga4PropertyId || discovered,
      provision,
    });
  }

  const health = moduleById(modules, "website-health");
  if (isRelevant(health)) {
    const gscReady = Boolean(signals.searchConsoleSiteUrl);
    const proposed = signals.proposedSearchConsoleSiteUrl;
    const execHint = signals.executiveSearchConsoleStatus?.trim();
    let reason: string;
    let resolutionClass: ExperienceDependency["resolutionClass"];
    let provision: ExperienceProvisionAction;
    if (gscReady) {
      reason = `Search Console site is stored on Client Infrastructure (${signals.searchConsoleSiteUrl}).`;
      resolutionClass = "satisfied";
      provision = noneProvision();
    } else if (proposed) {
      reason = [
        `Website Health is appropriate, but Search Console site URL is not stored.`,
        `A proposed identifier is ${proposed}. Storing that string is not the same as Search Console being configured.`,
        `KXD OS can list accessible Search Console properties through the connected Google account and confirm verification before import.`,
        execHint
          ? `Executive profile notes Search Console as “${execHint}” — that status is not the site URL field used by reporting.`
          : null,
        signals.searchConsoleStatus && signals.searchConsoleStatus !== "unknown"
          ? `Infrastructure Search Console status is “${signals.searchConsoleStatus}” and is independent of the site URL.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");
      resolutionClass = "actionable";
      provision = {
        kind: "discover",
        label: "Discover Search Console Property",
        href: hrefs.infrastructureEdit ?? hrefs.infrastructure,
        actionId: null,
        discoverKind: "search-console",
      };
    } else {
      reason = "Website Health is appropriate, but no domain exists from which to propose a Search Console property.";
      resolutionClass = "external";
      provision = {
        kind: "navigate",
        label: "Open infrastructure",
        href: hrefs.infrastructureEdit ?? hrefs.infrastructure,
        actionId: null,
        discoverKind: null,
      };
    }
    dependencies.push({
      id: "search-console",
      label: "Website Health (Search Console)",
      status: gscReady ? "satisfied" : "unresolved",
      resolutionClass,
      launchImpact: "blocking",
      reason,
      ownerSystem: "Client Infrastructure",
      ownerHref: hrefs.infrastructureEdit ?? hrefs.infrastructure,
      relatedModules: ["website-health"],
      discoveredValue: signals.searchConsoleSiteUrl || proposed,
      provision,
    });
  }

  const inventory = moduleById(modules, "inventory");
  if (isRelevant(inventory)) {
    const ready = signals.inventoryCount > 0;
    dependencies.push({
      id: "inventory",
      label: "Inventory listings",
      status: ready ? "satisfied" : "unresolved",
      resolutionClass: ready ? "satisfied" : "actionable",
      launchImpact: "blocking",
      reason: ready
        ? `${signals.inventoryCount} inventory listing${signals.inventoryCount === 1 ? "" : "s"} in KXD OS.`
        : "Inventory experience is appropriate, but no listings exist in client-inventory-vehicles. A public marketing catalog is a different system. Future sync requires a signed site→OS inventory adapter — not CSI lead ingest, and not a scraper.",
      ownerSystem: "Client Inventory",
      ownerHref: hrefs.inventory,
      relatedModules: ["inventory"],
      discoveredValue: ready ? String(signals.inventoryCount) : null,
      provision: ready
        ? noneProvision()
        : {
            kind: "navigate",
            label: "Open Inventory",
            href: hrefs.inventory,
            actionId: null,
            discoverKind: null,
          },
    });
  }

  const reports = moduleById(modules, "reports");
  if (isRelevant(reports)) {
    const ready = signals.publishedReportCount > 0;
    dependencies.push({
      id: "reports",
      label: "Published reports",
      status: ready ? "satisfied" : "unresolved",
      resolutionClass: ready ? "satisfied" : "actionable",
      launchImpact: "optional",
      reason: ready
        ? "Published client reports exist."
        : "Reports stay off until a published monthly report exists.",
      ownerSystem: "Reporting",
      ownerHref: hrefs.reportingOps,
      relatedModules: ["reports"],
      discoveredValue: ready ? String(signals.publishedReportCount) : null,
      provision: {
        kind: "navigate",
        label: "Open reporting operations",
        href: hrefs.reportingOps,
        actionId: null,
        discoverKind: null,
      },
    });
  }

  dependencies.push({
    id: "access",
    label: "Portal membership",
    status: signals.hasPortalMembership ? "satisfied" : "unresolved",
    resolutionClass: signals.hasPortalMembership ? "satisfied" : "actionable",
    launchImpact: "optional",
    reason: signals.hasPortalMembership
      ? `${signals.portalAccess.activeMembershipCount} portal membership${signals.portalAccess.activeMembershipCount === 1 ? "" : "s"} on file.`
      : "Portal membership is not configured. Invites stay on Manage Portal Access and are never sent automatically.",
    ownerSystem: "Portal Access",
    ownerHref: signals.portalAccess.manageHref,
    relatedModules: [],
    discoveredValue: null,
    provision: {
      kind: "navigate",
      label: "Manage Portal Access",
      href: signals.portalAccess.manageHref,
      actionId: null,
      discoverKind: null,
    },
  });

  const recommendedModules = modules.filter(
    (row) => row.decision === "include" || row.decision === "needs-setup",
  );
  const readyModules = recommendedModules.filter((row) => row.decision === "include");
  const moduleReadinessPercent =
    recommendedModules.length === 0
      ? 100
      : Math.round((readyModules.length / recommendedModules.length) * 100);

  const critical = dependencies.filter((dep) => dep.launchImpact === "blocking");
  const launchSatisfied =
    readyModules.length + critical.filter((dep) => dep.status === "satisfied").length;
  const launchTotal = recommendedModules.length + critical.length;
  const launchReadinessPercent =
    launchTotal === 0 ? 100 : Math.round((launchSatisfied / launchTotal) * 100);

  const activationBlockers: string[] = [];
  if (!logoSatisfied) {
    activationBlockers.push("Add a client logo before activating a client-facing experience.");
  }
  if (!colorsSatisfied) {
    activationBlockers.push("Store a trusted client brand color before activating. Do not ship KXD gold.");
  }
  for (const row of modules) {
    if (!accepted.has(row.id)) continue;
    if (row.id === "analytics" && !signals.ga4PropertyId) {
      activationBlockers.push("Analytics cannot activate until a GA4 property ID is stored on infrastructure.");
    }
    if (row.id === "website-health" && !signals.searchConsoleSiteUrl && !signals.ga4PropertyId) {
      activationBlockers.push(
        "Website Health cannot activate until Search Console or GA4 is stored on infrastructure.",
      );
    }
    if (row.id === "inventory" && signals.inventoryCount === 0) {
      activationBlockers.push("Inventory cannot activate until at least one listing exists in KXD OS.");
    }
    if (row.id === "reports" && signals.publishedReportCount === 0) {
      activationBlockers.push("Reports cannot activate until a published client report exists.");
    }
  }

  return {
    launchReadinessPercent,
    moduleReadinessPercent,
    activationEligible: activationBlockers.length === 0,
    activationBlockers,
    dependencies,
  };
}
