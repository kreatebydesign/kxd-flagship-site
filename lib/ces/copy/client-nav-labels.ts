/**
 * Client-facing portal navigation labels.
 * Presentation only — does not change canonical module IDs or entitlements.
 */

export const CES_CLIENT_NAV_LABELS: Record<string, string> = {
  overview: "Home",
  partnership: "Your partnership",
  "executive-performance": "Your partnership",
  "executive-review": "Monthly review",
  "website-review": "Website feedback",
  "website-workspace": "Website updates",
  requests: "Requests",
  "website-health": "Website status",
  analytics: "Performance",
  reports: "Reports",
  inventory: "Inventory",
  deliverables: "Completed work",
  projects: "Projects",
  assets: "Documents",
  resources: "Resources",
  invoices: "Billing",
  meetings: "Meetings",
  team: "Team",
  settings: "Account",
  advisor: "Advisor",
  portfolio: "Portfolio",
};

export const CES_CLIENT_NAV_GROUP_LABELS: Record<string, string> = {
  Headquarters: "",
  Work: "Your work",
  Library: "Documents",
  Intelligence: "Results",
  Account: "Account",
};

export function clientPortalNavLabel(
  id: string,
  terminology: Record<string, string> | undefined,
  fallback: string,
): string {
  const moduleKey = id === "partnership" ? "executive-performance" : id;
  return (
    terminology?.[`nav.${moduleKey}`]?.trim() ||
    terminology?.[`nav.${id}`]?.trim() ||
    CES_CLIENT_NAV_LABELS[id] ||
    CES_CLIENT_NAV_LABELS[moduleKey] ||
    fallback
  );
}

export function clientPortalNavGroupLabel(groupLabel: string): string {
  if (groupLabel in CES_CLIENT_NAV_GROUP_LABELS) {
    return CES_CLIENT_NAV_GROUP_LABELS[groupLabel];
  }
  return groupLabel;
}

export function isGenericWorkspaceSidebarLabel(label: string): boolean {
  return /^(your\s+)?(partnership\s+)?workspace$/i.test(label.trim());
}
