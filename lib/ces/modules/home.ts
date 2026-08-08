/**
 * Unified portal home composition — Phase 2.
 * Architecture/composition only. Does not redesign CES or Client HQ visuals.
 */

import { isCesModuleEnabled, type ResolvedExperienceProfile } from "../types";
import { CES_EXPERIENCE_MODULE_IDS, type PortalModuleId } from "./canonical";
import {
  isPortalModuleVisible,
  type PortalModuleVisibilityContext,
} from "./visibility";

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
  const hasCesExperience = CES_EXPERIENCE_MODULE_IDS.some((id) =>
    isCesModuleEnabled(profile, id),
  );
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

/** Website Review no longer selects the portal product — shell is profile/CES presence. */
export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return resolvePortalHomeShell(profile) === "ces";
}
