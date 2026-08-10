/**
 * Unified portal home composition — Phase 2 + luxury briefing presentation.
 * Entitlements remain canonical. This file only composes client-facing presentation.
 */

import { clientMetricLabel } from "../copy/portal-language";
import { clientServiceCapabilityCopy } from "../partnership/service-value";
import { isCesModuleEnabled, type ResolvedExperienceProfile } from "../types";
import type { PartnershipBriefing } from "../partnership/types";
import type { WorkPerformanceModel } from "@/lib/portal/work-performance";
import {
  CES_EXPERIENCE_MODULE_IDS,
  getCanonicalCapability,
  type PortalModuleId,
} from "./canonical";
import { isPortalModuleVisible, type PortalModuleVisibilityContext } from "./visibility";
import { SERVICE_CAPABILITY_CATALOG } from "@/lib/service-capabilities";

export type PortalHomeZoneId =
  | "executive-performance"
  | "partnership-briefing"
  | "work-performance"
  | "workspace-focus"
  | "website-review"
  | "website-workspace"
  | "projects"
  | "deliverables"
  | "requests"
  | "website-health"
  | "analytics"
  | "reports"
  | "inventory"
  | "billing"
  | "overview-activity";

export type PortalHomeShell = "ces" | "hq";

export type PortalHomeZone = {
  id: PortalHomeZoneId;
  visible: boolean;
  moduleId: PortalModuleId | null;
};

export type PortalHomeComposition = {
  architecture: "unified";
  shell: PortalHomeShell;
  clientId: number;
  zones: PortalHomeZone[];
};

export type ClientHomePresentationItem = {
  id: string;
  title: string;
  detail: string | null;
  meta: string | null;
  href: string | null;
};

export type ClientHomePerformanceFact = {
  id: string;
  label: string;
  value: string;
  detail: string | null;
};

export type ClientHomeBusinessImpact = {
  items: ClientHomePresentationItem[];
  note: string | null;
};

export type ClientHomeService = {
  id: string;
  title: string;
  detail: string | null;
  href: string | null;
};

export type ClientHomePresentation = {
  welcome: {
    eyebrow: string;
    greeting: string;
    lead: string;
  };
  attention: {
    items: ClientHomePresentationItem[];
    allClearTitle: string;
    allClearLead: string;
  };
  accomplishments: ClientHomePresentationItem[];
  advancing: ClientHomePresentationItem[];
  performance: {
    visible: boolean;
    facts: ClientHomePerformanceFact[];
    statusNote: string | null;
    href: string | null;
  };
  /** Future Lead & Business Impact band. Omit entirely when null. */
  businessImpact: ClientHomeBusinessImpact | null;
  services: ClientHomeService[];
};

const ZONE_MODULE: Record<PortalHomeZoneId, PortalModuleId | null> = {
  "executive-performance": "executive-performance",
  "partnership-briefing": "executive-performance",
  "work-performance": "overview",
  "workspace-focus": "overview",
  "website-review": "website-review",
  "website-workspace": "website-workspace",
  projects: "projects",
  deliverables: "deliverables",
  requests: "requests",
  "website-health": "website-health",
  analytics: "analytics",
  reports: "reports",
  inventory: "inventory",
  billing: "invoices",
  "overview-activity": "overview",
};

export function resolvePortalHomeShell(
  profile: ResolvedExperienceProfile | null | undefined,
): PortalHomeShell {
  if (!profile) return "hq";
  if (profile.source === "profile") return "ces";
  const hasCesExperience = CES_EXPERIENCE_MODULE_IDS.some((id) => isCesModuleEnabled(profile, id));
  return hasCesExperience ? "ces" : "hq";
}

export function resolvePortalHomeComposition(
  ctx: PortalModuleVisibilityContext,
): PortalHomeComposition {
  const { profile } = ctx;
  const shell = resolvePortalHomeShell(profile);
  const epVisible = isPortalModuleVisible("executive-performance", ctx);

  const zoneVisible = (id: PortalHomeZoneId): boolean => {
    switch (id) {
      case "executive-performance":
      case "partnership-briefing":
        return epVisible;
      case "work-performance":
      case "workspace-focus":
        return isPortalModuleVisible("overview", ctx);
      case "overview-activity":
        return shell === "hq";
      default: {
        const moduleId = ZONE_MODULE[id];
        return moduleId ? isPortalModuleVisible(moduleId, ctx) : false;
      }
    }
  };

  const zoneIds = Object.keys(ZONE_MODULE) as PortalHomeZoneId[];

  return {
    architecture: "unified",
    shell,
    clientId: profile.identity.clientId,
    zones: zoneIds.map((id) => ({
      id,
      visible: zoneVisible(id),
      moduleId: ZONE_MODULE[id],
    })),
  };
}

export function isHomeZoneVisible(
  composition: PortalHomeComposition,
  zoneId: PortalHomeZoneId,
): boolean {
  return composition.zones.some((zone) => zone.id === zoneId && zone.visible);
}

export type CesHomeSurface = "executive-performance" | "client-command" | "partnership-briefing";

/**
 * CES home render precedence from canonical zone composition + composed briefings.
 * Work-performance data alone never replaces a composed Executive Performance home.
 */
export function resolveCesHomeSurface(input: {
  homeComposition: PortalHomeComposition;
  hasExecutivePerformance: boolean;
  hasWorkPerformance: boolean;
}): CesHomeSurface {
  const executiveOwnsHome = isHomeZoneVisible(input.homeComposition, "executive-performance");
  if (executiveOwnsHome && input.hasExecutivePerformance) {
    return "executive-performance";
  }
  if (input.hasWorkPerformance) return "client-command";
  return "partnership-briefing";
}

function moduleHref(moduleId: PortalModuleId): string | null {
  return getCanonicalCapability(moduleId)?.portal?.href ?? null;
}

function firstVisibleModuleHref(
  moduleIds: readonly string[],
  ctx: PortalModuleVisibilityContext,
): string | null {
  for (const id of moduleIds) {
    if (!isPortalModuleVisible(id, ctx)) continue;
    const href = moduleHref(id as PortalModuleId);
    if (href) return href;
  }
  return null;
}

function serviceMentions(services: ClientHomeService[], pattern: RegExp): boolean {
  return services.some(
    (service) => pattern.test(service.title) || pattern.test(service.detail ?? ""),
  );
}

function composeWelcomeLead(services: ClientHomeService[]): string {
  if (services.length === 0) {
    return "This is your private Kreate by Design partnership space. Ongoing work stays organized here.";
  }

  const parts: string[] = [];
  if (serviceMentions(services, /website|hosting/i)) parts.push("your website");
  if (serviceMentions(services, /search|seo|visibility/i)) parts.push("search visibility");
  if (serviceMentions(services, /analytics|performance/i)) {
    parts.push("performance reporting");
  }
  if (serviceMentions(services, /inventory|showroom/i)) parts.push("inventory");

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const head = parts.slice(0, -1);
    const joined =
      head.length === 1 ? `${head[0]} and ${last}` : `${head.join(", ")}, and ${last}`;
    return `KXD is managing the digital services included in your partnership and keeping ${joined} organized here.`;
  }
  if (parts.length === 1) {
    return `KXD is managing the digital services included in your partnership, including ${parts[0]}.`;
  }
  if (services.length === 1 && services[0]) {
    return `KXD is managing ${services[0].title.toLowerCase()} for this partnership.`;
  }
  return "KXD is managing the digital services included in your partnership and keeping ongoing work organized here.";
}

function composePerformance(
  workPerformance: WorkPerformanceModel,
  ctx: PortalModuleVisibilityContext,
  services: ClientHomeService[],
): ClientHomePresentation["performance"] {
  const commerciallyEntitled = serviceMentions(
    services,
    /analytics|performance reporting|search visibility|seo/i,
  );
  const searchVisible =
    isPortalModuleVisible("analytics", ctx) || isPortalModuleVisible("website-health", ctx);

  if (!commerciallyEntitled) {
    return { visible: false, facts: [], statusNote: null, href: null };
  }

  const href = firstVisibleModuleHref(["analytics", "website-health", "reports"], ctx);

  if (workPerformance.analytics.availability === "ready") {
    const facts = workPerformance.analytics.metrics.slice(0, 4).map((metric) => ({
      id: metric.key,
      label: clientMetricLabel(metric.key, metric.label),
      value: metric.valueLabel,
      detail: metric.domain === "search" && searchVisible ? metric.deltaLabel : null,
    }));
    if (facts.length > 0) {
      return {
        visible: true,
        facts,
        statusNote: null,
        href,
      };
    }
  }

  return {
    visible: true,
    facts: [],
    statusNote: "Performance reporting is being prepared.",
    href,
  };
}

function composeHomeServices(
  briefing: PartnershipBriefing,
  ctx: PortalModuleVisibilityContext,
): ClientHomeService[] {
  return briefing.services.items.map((item) => {
    const capability = SERVICE_CAPABILITY_CATALOG.find((entry) => {
      const copy = clientServiceCapabilityCopy(entry);
      return copy.label === item.label || entry.label === item.label;
    });
    return {
      id: item.id,
      title: item.label,
      detail: item.value,
      href: capability ? firstVisibleModuleHref(capability.grantsModules, ctx) : null,
    };
  });
}

function isLegitimateBusinessImpact(
  impact: ClientHomeBusinessImpact | null | undefined,
): impact is ClientHomeBusinessImpact {
  if (!impact || impact.items.length === 0) return false;
  const blob = JSON.stringify(impact).toLowerCase();
  if (
    blob.includes("$300") ||
    blob.includes("commission") ||
    blob.includes("ga4") ||
    blob.includes("reportingfacts") ||
    blob.includes("property id") ||
    blob.includes("ingest")
  ) {
    return false;
  }
  return impact.items.every((item) => item.title.trim().length > 0);
}

/**
 * Read-only client presentation adapter. It reshapes existing evidence and
 * recommendations; it does not create a second intelligence layer.
 */
export function composeClientHomePresentation(input: {
  greeting: string;
  profile: ResolvedExperienceProfile;
  briefing: PartnershipBriefing;
  workPerformance: WorkPerformanceModel;
  /** Future confirmed/client-safe aggregates only. Never invent from GA4. */
  businessImpact?: ClientHomeBusinessImpact | null;
}): ClientHomePresentation {
  const { greeting, profile, briefing, workPerformance } = input;
  const ctx: PortalModuleVisibilityContext = { profile };
  const services = composeHomeServices(briefing, ctx);

  const attentionItems: ClientHomePresentationItem[] = workPerformance.currentlyInProgress
    .filter((item) => item.owner === "client" || item.owner === "shared")
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.statusLabel,
      meta: item.owner === "client" ? "Waiting on you" : "Needs your input too",
      href: item.href,
    }));

  if (attentionItems.length === 0 && briefing.needsAttention.action) {
    attentionItems.push({
      id: "partnership-attention",
      title: briefing.needsAttention.action,
      detail: null,
      meta: "Waiting on you",
      href: briefing.needsAttention.href,
    });
  }

  const businessImpact = isLegitimateBusinessImpact(input.businessImpact ?? null)
    ? input.businessImpact!
    : null;

  return {
    welcome: {
      eyebrow: profile.hospitality.welcomeEyebrow?.trim() || "Your partnership",
      greeting,
      lead: composeWelcomeLead(services),
    },
    attention: {
      items: attentionItems,
      allClearTitle: "Nothing needs your attention.",
      allClearLead: "You're all caught up.",
    },
    accomplishments: workPerformance.completedThisMonth.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.categoryLabel,
      meta: item.completedAt
        ? new Date(item.completedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "Completed this month",
      href: item.href,
    })),
    advancing: workPerformance.currentlyInProgress.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.statusLabel,
      meta:
        item.owner === "client"
          ? "Waiting on you"
          : item.owner === "shared"
            ? "Needs your input too"
            : "KXD is managing this",
      href: item.href,
    })),
    performance: composePerformance(workPerformance, ctx, services),
    businessImpact,
    services,
  };
}

/** Website Review no longer selects the portal product — shell is profile/CES presence. */
export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return resolvePortalHomeShell(profile) === "ces";
}
