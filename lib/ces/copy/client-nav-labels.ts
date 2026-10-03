/**
 * Client-facing portal navigation labels.
 * Presentation only — does not change canonical module IDs or entitlements.
 */

export const CES_CLIENT_NAV_LABELS: Record<string, string> = {
  overview: "Overview",
  partnership: "Your partnership",
  "executive-performance": "Your partnership",
  "executive-review": "Monthly review",
  "website-review": "Website feedback",
  "website-workspace": "Website updates",
  leads: "Leads",
  requests: "Requests",
  "website-health": "Website status",
  analytics: "Performance",
  reports: "Reports",
  inventory: "Inventory",
  calendar: "Calendar",
  deliverables: "KXD Work",
  projects: "Projects",
  assets: "Documents",
  resources: "Resources",
  invoices: "Billing",
  meetings: "Meetings",
  team: "Team",
  settings: "Account",
  advisor: "Advisor",
  portfolio: "All Businesses",
};

/**
 * Primary operating destinations — Overview + Leads lead; results follow.
 * Remaining entitled modules stay under Partnership / Account groupings.
 */
export const CES_PRIMARY_PORTAL_NAV_IDS = [
  "overview",
  "leads",
  "calendar",
  "analytics",
  "reports",
] as const;

/** Results destinations shown after the operating pair. */
export const CES_RESULTS_PORTAL_NAV_IDS = ["analytics", "reports"] as const;

export const CES_CLIENT_NAV_GROUP_LABELS: Record<string, string> = {
  Headquarters: "Operate",
  Work: "Website",
  Library: "Website",
  Intelligence: "Results",
  Account: "Account",
};

/** Destinations that belong with website operations rather than relationship history. */
export const CES_WEBSITE_PORTAL_NAV_IDS = [
  "website-review",
  "website-workspace",
  "website-health",
  "inventory",
  "website-editor",
] as const;

/** Historical relationship surfaces — remain routable, not primary Primal nav. */
export const CES_PRIMAL_ARCHIVE_NAV_IDS = [
  "partnership",
  "executive-performance",
  "executive-review",
] as const;

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
