import type { CesModuleId } from "@/lib/ces";
import { CES_MODULE_REGISTRY } from "@/lib/ces/modules/registry";
import { getCesNavItems, resolveCesNavId } from "@/lib/ces/modules/nav";
import type { CesNavGroupId } from "@/lib/ces/modules/types";
import {
  CLIENT_HQ_PORTAL_MODULE_IDS,
  getCanonicalCapability,
  type ClientHqPortalModuleId,
  type PortalModuleId,
} from "@/lib/ces/modules/canonical";
import { isPortalModuleVisible } from "@/lib/ces/modules/visibility";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { getEditionBranding, getEditionNavigation } from "@/lib/editions";
import { isPortalNavEnabled } from "@/lib/editions/navigation";
import { isClientHqModuleEnabled, type ClientHqModuleId } from "./modules";
import { clientPortalNavLabel } from "@/lib/ces/copy/client-nav-labels";
import { resolvePortalHomeShell } from "@/lib/ces/modules/home";

export type ClientHqNavId = ClientHqModuleId;
/** Shared Core partnership briefing — nav id aliases executive-performance. */
export type PortalBriefingNavId = "partnership";
/** Phase 4 Batch F — multi-account authorized portfolio (not a CES entitlement). */
export type PortalPortfolioNavId = "portfolio";
export type PortalNavId =
  | ClientHqNavId
  | CesModuleId
  | PortalBriefingNavId
  | PortalPortfolioNavId;

export interface ClientHqNavItem {
  id: ClientHqNavId;
  label: string;
  href: string;
  moduleId: ClientHqModuleId;
}

export interface ClientHqNavGroup {
  label: string;
  items: ClientHqNavItem[];
}

export interface PortalNavItem {
  id: PortalNavId;
  label: string;
  href: string;
}

export interface PortalNavGroup {
  label: string;
  items: PortalNavItem[];
}

const PORTAL_GROUP_TO_CES: Record<string, CesNavGroupId> = {
  Headquarters: "headquarters",
  Work: "work",
  Library: "library",
  Intelligence: "intelligence",
  Account: "account",
};

const GROUP_LABELS: Record<CesNavGroupId, string> = {
  headquarters: "Headquarters",
  work: "Work",
  library: "Library",
  intelligence: "Intelligence",
  account: "Account",
};

function hqNavItem(id: ClientHqPortalModuleId): ClientHqNavItem {
  const def = getCanonicalCapability(id);
  return {
    id,
    label: def?.label ?? id,
    href: def?.portal?.href ?? `/portal/${id}`,
    moduleId: id,
  };
}

const NAV_ITEMS: ClientHqNavItem[] = CLIENT_HQ_PORTAL_MODULE_IDS.map(hqNavItem);

export const CLIENT_HQ_NAV_GROUPS: ClientHqNavGroup[] = (
  ["headquarters", "work", "library", "intelligence", "account"] as CesNavGroupId[]
).map((groupId) => ({
  label: GROUP_LABELS[groupId],
  items: NAV_ITEMS.filter((item) => {
    const def = getCanonicalCapability(item.id);
    return def?.portal?.navGroup === groupId;
  }).sort((a, b) => {
    const orderA = getCanonicalCapability(a.id)?.portal?.navOrder ?? 0;
    const orderB = getCanonicalCapability(b.id)?.portal?.navOrder ?? 0;
    return orderA - orderB;
  }),
})).filter((group) => group.items.length > 0);

export function getEnabledClientHqNavGroups(): ClientHqNavGroup[] {
  const editionNav = getEditionNavigation();

  return CLIENT_HQ_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => isClientHqModuleEnabled(item.moduleId))
      .filter((item) => isPortalNavEnabled(item.id))
      .map((item) => ({
        ...item,
        label: editionNav.portalNavLabels[item.id] ?? item.label,
      })),
  })).filter((group) => group.items.length > 0);
}

function navIdForPortalModule(moduleId: PortalModuleId): PortalNavId {
  if (moduleId === "executive-performance") return "partnership";
  return moduleId as PortalNavId;
}

/** Client HQ nav + CES module items — visibility is entitlement-aware, not flagship. */
export function getEnabledPortalNavGroups(
  profile?: ResolvedExperienceProfile | null,
  options?: {
    portfolioNavAvailable?: boolean;
    billingNavAvailable?: boolean;
  },
): PortalNavGroup[] {
  const portfolioNavAvailable = Boolean(options?.portfolioNavAvailable);
  const billingNavAvailable = Boolean(options?.billingNavAvailable);
  const base = getEnabledClientHqNavGroups();

  if (!profile) {
    return base
      .map((group) => {
        const portfolioItem: PortalNavItem[] =
          portfolioNavAvailable && group.label === "Headquarters"
            ? [{ id: "portfolio", label: "Portfolio", href: "/portal/portfolio" }]
            : [];
        return {
          label: group.label,
          items: [
            ...group.items
              .filter((item) =>
                item.id === "invoices" ? billingNavAvailable : true,
              )
              .map(({ id, label, href }) => ({
                id: id as PortalNavId,
                label,
                href,
              })),
            ...portfolioItem,
          ],
        };
      })
      .filter((group) => group.items.length > 0);
  }

  const visibilityCtx = {
    profile,
    billingNavAvailable,
    portfolioNavAvailable,
  };
  const useClientLabels = resolvePortalHomeShell(profile) === "ces";
  const relabel = (id: string, label: string) =>
    useClientLabels ? clientPortalNavLabel(id, profile.terminology, label) : label;

  const cesItems = getCesNavItems(profile).filter((item) =>
    isPortalModuleVisible(item.moduleId, visibilityCtx),
  );

  return base
    .map((group) => {
      const cesGroupId = PORTAL_GROUP_TO_CES[group.label];
      const cesForGroup = cesItems
        .filter((item) => {
          const def = CES_MODULE_REGISTRY.find((d) => d.moduleId === item.moduleId);
          return def?.navGroup === cesGroupId;
        })
        .map((item) => ({
          id: navIdForPortalModule(item.moduleId as PortalModuleId),
          label: relabel(item.moduleId, item.label),
          href: item.href,
        }));

      const portfolioItem: PortalNavItem[] =
        portfolioNavAvailable && group.label === "Headquarters"
          ? [{ id: "portfolio", label: "Portfolio", href: "/portal/portfolio" }]
          : [];

      const partnershipItem: PortalNavItem[] =
        group.label === "Headquarters" &&
        isPortalModuleVisible("executive-performance", visibilityCtx) &&
        !cesForGroup.some((item) => item.id === "partnership")
          ? [
              {
                id: "partnership",
                label: relabel(
                  "executive-performance",
                  profile.terminology["nav.executive-performance"] ??
                    getCanonicalCapability("executive-performance")?.label ??
                    "Partnership",
                ),
                href: "/portal/partnership",
              },
            ]
          : [];

      return {
        label: group.label,
        items: [
          ...group.items.map(({ id, label, href }) => ({
            id: id as PortalNavId,
            label: relabel(id, label),
            href,
          })),
          ...partnershipItem,
          ...portfolioItem,
          ...cesForGroup,
        ],
      };
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const moduleKey =
          item.id === "partnership" ? "executive-performance" : item.id;
        return isPortalModuleVisible(moduleKey, visibilityCtx);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolvePortalNavId(pathname: string): PortalNavId {
  if (pathname === "/portal/portfolio" || pathname.startsWith("/portal/portfolio/")) {
    return "portfolio";
  }
  if (pathname === "/portal/partnership" || pathname.startsWith("/portal/partnership/")) {
    return "partnership";
  }

  const cesId = resolveCesNavId(pathname);
  if (cesId) {
    return cesId === "executive-performance"
      ? "partnership"
      : (cesId as PortalNavId);
  }

  const allItems = CLIENT_HQ_NAV_GROUPS.flatMap((g) => g.items);
  const sorted = [...allItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((item) => clientHqNavIsActive(pathname, item.href));
  return match?.id ?? "overview";
}

export function getPortalEditionBranding() {
  return getEditionBranding();
}

export function clientHqNavIsActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname.startsWith(href);
}
