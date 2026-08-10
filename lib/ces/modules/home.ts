/**
 * Unified portal home composition — Phase 2.
 * Architecture/composition only. Does not redesign CES or Client HQ visuals.
 */

import { isCesModuleEnabled, type ResolvedExperienceProfile } from "../types";
import type { PartnershipBriefing } from "../partnership/types";
import type { WorkPerformanceModel } from "@/lib/portal/work-performance";
import { CES_EXPERIENCE_MODULE_IDS, type PortalModuleId } from "./canonical";
import { isPortalModuleVisible, type PortalModuleVisibilityContext } from "./visibility";

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

export type ClientHomePresentation = {
  opening: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  snapshot: Array<{ label: string; value: string }>;
  accomplishments: ClientHomePresentationItem[];
  activeWork: ClientHomePresentationItem[];
  attention: ClientHomePresentationItem[];
  opportunities: ClientHomePresentationItem[];
  next: {
    title: string;
    detail: string;
    href: string | null;
  };
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

/**
 * Read-only client presentation adapter. It reshapes existing evidence and
 * recommendations; it does not create a second intelligence layer.
 */
export function composeClientHomePresentation(input: {
  displayName: string;
  greeting: string;
  profile: ResolvedExperienceProfile;
  briefing: PartnershipBriefing;
  workPerformance: WorkPerformanceModel;
}): ClientHomePresentation {
  const { greeting, briefing, workPerformance } = input;
  const attention: ClientHomePresentationItem[] = workPerformance.currentlyInProgress
    .filter((item) => item.owner === "client" || item.owner === "shared")
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.statusLabel,
      meta: item.owner === "client" ? "Waiting on you" : "Shared next step",
      href: item.href,
    }));

  if (attention.length === 0 && briefing.needsAttention.action) {
    attention.push({
      id: "partnership-attention",
      title: briefing.needsAttention.action,
      detail: null,
      meta: "Waiting on you",
      href: briefing.needsAttention.href,
    });
  }

  const opportunities = workPerformance.nextMoves.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title,
    detail: item.lead,
    meta: "Recommended next move",
    href: item.href,
  }));
  const primaryNext = opportunities[0];

  return {
    opening: {
      eyebrow: "Private business command center",
      title: greeting,
      lead: briefing.recommendation.rationale,
    },
    snapshot: [
      {
        label: "Completed this month",
        value: String(workPerformance.valueSummary.completedCount),
      },
      {
        label: "Active work",
        value: String(workPerformance.valueSummary.activeCount),
      },
      {
        label: "Waiting on you",
        value: String(workPerformance.valueSummary.awaitingClientCount),
      },
      ...(workPerformance.analytics.availability === "ready"
        ? workPerformance.analytics.metrics.slice(0, 1).map((metric) => ({
            label: metric.label,
            value: metric.valueLabel,
          }))
        : []),
    ],
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
    activeWork: workPerformance.currentlyInProgress.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.statusLabel,
      meta:
        item.owner === "client"
          ? "Waiting on you"
          : item.owner === "shared"
            ? "Shared next step"
            : "KXD is managing this",
      href: item.href,
    })),
    attention,
    opportunities,
    next: {
      title: primaryNext?.title ?? briefing.overview.nextMilestone,
      detail:
        primaryNext?.detail ??
        "KXD will keep this workspace current as the next agreed priority advances.",
      href: primaryNext?.href ?? null,
    },
  };
}

/** Website Review no longer selects the portal product — shell is profile/CES presence. */
export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return resolvePortalHomeShell(profile) === "ces";
}
