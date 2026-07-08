import type { CesModuleId } from "@/lib/ces";
import { CES_MODULE_REGISTRY } from "@/lib/ces/modules/registry";
import { getCesNavItems, resolveCesNavId } from "@/lib/ces/modules/nav";
import type { CesNavGroupId } from "@/lib/ces/modules/types";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { CLIENT_HQ_MODULES, isClientHqModuleEnabled, type ClientHqModuleId } from "./modules";
import { getEditionBranding, getEditionNavigation } from "@/lib/editions";
import { isPortalNavEnabled } from "@/lib/editions/navigation";
import { isPortalNavVisibleForCesLaunch } from "@/lib/portal/ces-launch-safety";

export type ClientHqNavId = ClientHqModuleId;
export type PortalNavId = ClientHqNavId | CesModuleId;

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

const NAV_ITEMS: ClientHqNavItem[] = [
  { id: "overview", label: "Overview", href: "/portal", moduleId: "overview" },
  { id: "projects", label: "Projects", href: "/portal/projects", moduleId: "projects" },
  { id: "deliverables", label: "Deliverables", href: "/portal/deliverables", moduleId: "deliverables" },
  { id: "requests", label: "Requests", href: "/portal/requests", moduleId: "requests" },
  { id: "assets", label: "Assets", href: "/portal/assets", moduleId: "assets" },
  { id: "invoices", label: "Invoices", href: "/portal/invoices", moduleId: "invoices" },
  { id: "meetings", label: "Meetings", href: "/portal/meetings", moduleId: "meetings" },
  { id: "analytics", label: "Analytics", href: "/portal/analytics", moduleId: "analytics" },
  { id: "reports", label: "Reports", href: "/portal/reports", moduleId: "reports" },
  { id: "website-health", label: "Website Health", href: "/portal/website-health", moduleId: "website-health" },
  { id: "resources", label: "Resources", href: "/portal/resources", moduleId: "resources" },
  { id: "team", label: "Team", href: "/portal/team", moduleId: "team" },
  { id: "settings", label: "Settings", href: "/portal/settings", moduleId: "settings" },
  { id: "advisor", label: "AI Advisor", href: "/portal/advisor", moduleId: "advisor" },
];

export const CLIENT_HQ_NAV_GROUPS: ClientHqNavGroup[] = [
  {
    label: "Headquarters",
    items: NAV_ITEMS.filter((i) => i.id === "overview"),
  },
  {
    label: "Work",
    items: NAV_ITEMS.filter((i) =>
      ["projects", "deliverables", "requests"].includes(i.id),
    ),
  },
  {
    label: "Library",
    items: NAV_ITEMS.filter((i) => ["assets", "resources"].includes(i.id)),
  },
  {
    label: "Intelligence",
    items: NAV_ITEMS.filter((i) =>
      ["website-health", "analytics", "reports", "advisor"].includes(i.id),
    ),
  },
  {
    label: "Account",
    items: NAV_ITEMS.filter((i) =>
      ["invoices", "meetings", "team", "settings"].includes(i.id),
    ),
  },
];

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

/** Client HQ nav + CES module items when profile enables them */
export function getEnabledPortalNavGroups(
  profile?: ResolvedExperienceProfile | null,
): PortalNavGroup[] {
  const base = getEnabledClientHqNavGroups();
  if (!profile) {
    return base.map((group) => ({
      label: group.label,
      items: group.items.map(({ id, label, href }) => ({ id, label, href })),
    }));
  }

  const cesItems = getCesNavItems(profile);

  return base
    .map((group) => {
      const cesGroupId = PORTAL_GROUP_TO_CES[group.label];
      const cesForGroup = cesItems
        .filter((item) => {
          const def = CES_MODULE_REGISTRY.find((d) => d.moduleId === item.moduleId);
          return def?.navGroup === cesGroupId;
        })
        .map((item) => ({
          id: item.id as PortalNavId,
          label: item.label,
          href: item.href,
        }));

      return {
        label: group.label,
        items: [
          ...group.items.map(({ id, label, href }) => ({ id, label, href })),
          ...cesForGroup,
        ],
      };
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isPortalNavVisibleForCesLaunch(item.id, profile)),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolvePortalNavId(pathname: string): PortalNavId {
  const cesId = resolveCesNavId(pathname);
  if (cesId) return cesId as PortalNavId;

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
