import type { ResolvedExperienceProfile } from "../types";
import { isCesModuleEnabled } from "../types";
import { CES_MODULE_REGISTRY } from "./registry";
import type { CesNavGroupId } from "./types";

export interface CesNavItem {
  id: string;
  label: string;
  href: string;
  moduleId: string;
}

const GROUP_LABELS: Record<CesNavGroupId, string> = {
  headquarters: "Headquarters",
  work: "Work",
  library: "Library",
  intelligence: "Intelligence",
  account: "Account",
};

export function getCesNavItems(profile: ResolvedExperienceProfile): CesNavItem[] {
  return CES_MODULE_REGISTRY.filter((def) => isCesModuleEnabled(profile, def.moduleId))
    .map((def) => ({
      id: def.moduleId,
      label: profile.terminology[`nav.${def.moduleId}`] ?? def.label,
      href: def.routes.landing,
      moduleId: def.moduleId,
    }))
    .sort((a, b) => {
      const orderA = CES_MODULE_REGISTRY.find((d) => d.moduleId === a.moduleId)?.navOrder ?? 0;
      const orderB = CES_MODULE_REGISTRY.find((d) => d.moduleId === b.moduleId)?.navOrder ?? 0;
      return orderA - orderB;
    });
}

export function getCesNavGroupLabel(groupId: CesNavGroupId): string {
  return GROUP_LABELS[groupId];
}

export function resolveCesNavId(pathname: string): string | null {
  for (const def of CES_MODULE_REGISTRY) {
    if (pathname === def.routes.landing || pathname.startsWith(`${def.routes.landing}/`)) {
      return def.moduleId;
    }
  }
  return null;
}
