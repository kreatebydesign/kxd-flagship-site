import { CLIENT_HQ_MODULES, type ClientHqModuleId } from "./modules";

export type ClientHqNavId = ClientHqModuleId;

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
  return CLIENT_HQ_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => CLIENT_HQ_MODULES[item.moduleId]?.enabled),
  })).filter((group) => group.items.length > 0);
}

export function clientHqNavIsActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname.startsWith(href);
}
