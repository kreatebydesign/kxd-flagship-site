import {
  listCesRegistryDefinitions,
  type PortalModuleId,
} from "./canonical";
import type { CesModuleDefinition } from "./types";
import type { CesModuleId } from "../types";

function requestPath(href: string): string {
  if (href === "/portal/website-review") return "/portal/website-review/request";
  if (href === "/portal/website-workspace") return "/portal/website-workspace";
  if (href === "/portal/inventory") return "/portal/inventory/new";
  return href;
}

function detailPath(href: string): (id: string) => string {
  if (href === "/portal/website-review") {
    return (id) => `/portal/website-review/${id}`;
  }
  if (href === "/portal/website-workspace") {
    return (id) => `/portal/website-workspace/requests/${id}`;
  }
  if (href === "/portal/inventory") {
    return (id) => `/portal/inventory/${id}`;
  }
  return () => href;
}

/** CES experience modules — derived from the canonical capability registry. */
export const CES_MODULE_REGISTRY: CesModuleDefinition[] = listCesRegistryDefinitions()
  .filter((def) => def.portal)
  .map((def) => {
    const portal = def.portal!;
    return {
      moduleId: def.key as CesModuleId,
      label: def.label,
      navGroup: portal.navGroup,
      navOrder: portal.navOrder,
      routes: {
        landing: portal.href,
        request: requestPath(portal.href),
        detail: detailPath(portal.href),
      },
      vocabularyNamespace: portal.vocabularyNamespace ?? def.key,
    };
  })
  .sort((a, b) => a.navOrder - b.navOrder);

export function getCesModuleDefinition(moduleId: string): CesModuleDefinition | undefined {
  const canonical =
    moduleId === "partnership" ? "executive-performance" : moduleId;
  return CES_MODULE_REGISTRY.find((m) => m.moduleId === canonical);
}

export function isCesRegistryModuleId(moduleId: string): moduleId is CesModuleId {
  return CES_MODULE_REGISTRY.some((m) => m.moduleId === moduleId);
}

export type { PortalModuleId };
