import type { PortalNavGroup, PortalNavItem } from "@/lib/portal/nav";
import type { PortalModuleVisibilityContext } from "@/lib/ces/modules/visibility";
import { isPortalModuleVisible } from "@/lib/ces/modules/visibility";
import {
  primalAdvancedSchoolOperationsUrl,
  primalOsDiscoveryUrl,
} from "@/lib/primal/operational-urls";

export type PrimalOperationalNavId = "primal-school-operations" | "primal-os-discovery";

const PRIMAL_CLIENT_SLUG = "primal-motorsports";

export function isPrimalOperationalNavEligible(
  clientSlug: string | null | undefined,
  visibilityCtx: PortalModuleVisibilityContext,
): boolean {
  if (clientSlug !== PRIMAL_CLIENT_SLUG) return false;
  return isPortalModuleVisible("leads", visibilityCtx);
}

/**
 * Injects HTTPS deep links into the portal for Primal Advanced School Operations
 * and Primal OS discovery. Visible only for the Primal Motorsports client profile.
 */
export function injectPrimalOperationalNav(
  groups: PortalNavGroup[],
  clientSlug: string | null | undefined,
  visibilityCtx: PortalModuleVisibilityContext,
): PortalNavGroup[] {
  if (!isPrimalOperationalNavEligible(clientSlug, visibilityCtx)) {
    return groups;
  }

  const items: PortalNavItem[] = [
    {
      id: "primal-school-operations",
      label: "Advanced School Operations ↗",
      href: primalAdvancedSchoolOperationsUrl(),
      external: true,
    },
    {
      id: "primal-os-discovery",
      label: "Primal OS discovery ↗",
      href: primalOsDiscoveryUrl(),
      external: true,
    },
  ];

  const existing = new Set(
    groups.flatMap((g) => g.items.map((i) => i.id)),
  );
  const toAdd = items.filter((item) => !existing.has(item.id));
  if (toAdd.length === 0) return groups;

  const operateIndex = groups.findIndex((g) => g.label === "Work" || g.label === "Headquarters");
  if (operateIndex >= 0) {
    const next = [...groups];
    next[operateIndex] = {
      ...next[operateIndex],
      items: [...next[operateIndex].items, ...toAdd],
    };
    return next;
  }

  return [
    ...groups,
    {
      label: "Operate",
      items: toAdd,
    },
  ];
}