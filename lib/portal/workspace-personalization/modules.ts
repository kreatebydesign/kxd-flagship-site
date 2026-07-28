/**
 * Typed workspace module registry — presentation metadata only.
 * Entitlements and route ownership remain authoritative elsewhere.
 */

import type { CesModuleId } from "@/lib/ces";
import type { ClientHqModuleId } from "@/lib/portal/modules";
import type { WorkspaceModuleKey } from "./types";
import type { WorkspaceSafePortalHref } from "./safe-routes";

export type WorkspaceModuleCapability =
  | { kind: "client-hq"; moduleId: ClientHqModuleId }
  | { kind: "ces"; moduleId: CesModuleId }
  | { kind: "always" };

export type WorkspaceModuleDefinition = {
  key: WorkspaceModuleKey;
  defaultLabel: string;
  description: string;
  href: WorkspaceSafePortalHref;
  capability: WorkspaceModuleCapability;
  emptyTitle: string;
  emptyLead: string;
};

export const WORKSPACE_MODULE_REGISTRY: WorkspaceModuleDefinition[] = [
  {
    key: "overview",
    defaultLabel: "Overview",
    description: "A calm view of your partnership workspace.",
    href: "/portal",
    capability: { kind: "always" },
    emptyTitle: "Your workspace is ready",
    emptyLead: "As work begins, updates and next steps will appear here.",
  },
  {
    key: "website-review",
    defaultLabel: "Website Review",
    description: "Review the site, leave precise feedback, and follow every revision.",
    href: "/portal/website-review",
    capability: { kind: "ces", moduleId: "website-review" },
    emptyTitle: "No website reviews yet",
    emptyLead: "Start a review when you have notes, screenshots, or revision requests.",
  },
  {
    key: "website-workspace",
    defaultLabel: "Website Workspace",
    description: "Request precise website updates by page and section.",
    href: "/portal/website-workspace",
    capability: { kind: "ces", moduleId: "website-workspace" },
    emptyTitle: "No website update requests yet",
    emptyLead: "Open a page when you are ready to request a change.",
  },
  {
    key: "executive-review",
    defaultLabel: "Executive Review",
    description: "A focused executive view of partnership performance.",
    href: "/portal/executive-review",
    capability: { kind: "ces", moduleId: "executive-review" },
    emptyTitle: "Executive Review is ready",
    emptyLead: "Insights will appear here as reporting and partnership data accumulate.",
  },
  {
    key: "inventory",
    defaultLabel: "Inventory",
    description: "Manage listings for your public website.",
    href: "/portal/inventory",
    capability: { kind: "ces", moduleId: "inventory" },
    emptyTitle: "No listings yet",
    emptyLead: "Add your first listing when you are ready to publish.",
  },
  {
    key: "projects",
    defaultLabel: "Projects",
    description: "Active and completed partnership projects.",
    href: "/portal/projects",
    capability: { kind: "client-hq", moduleId: "projects" },
    emptyTitle: "No projects yet",
    emptyLead: "Projects will appear here as KXD begins delivery work.",
  },
  {
    key: "deliverables",
    defaultLabel: "Deliverables",
    description: "Shared deliverables ready for your review.",
    href: "/portal/deliverables",
    capability: { kind: "client-hq", moduleId: "deliverables" },
    emptyTitle: "No deliverables yet",
    emptyLead: "New deliverables will appear here when they are ready to share.",
  },
  {
    key: "requests",
    defaultLabel: "Requests",
    description: "Submit and track partnership requests.",
    href: "/portal/requests",
    capability: { kind: "client-hq", moduleId: "requests" },
    emptyTitle: "No requests yet",
    emptyLead: "Submit a request when you need something from the KXD team.",
  },
  {
    key: "reports",
    defaultLabel: "Reports",
    description: "Published reports for your partnership.",
    href: "/portal/reports",
    capability: { kind: "client-hq", moduleId: "reports" },
    emptyTitle: "No reports yet",
    emptyLead: "Reports will appear here when they are published for your workspace.",
  },
  {
    key: "analytics",
    defaultLabel: "Analytics",
    description: "Performance and analytics visibility.",
    href: "/portal/analytics",
    capability: { kind: "client-hq", moduleId: "analytics" },
    emptyTitle: "Analytics coming into view",
    emptyLead: "Analytics surfaces appear here when reporting is enabled for your plan.",
  },
  {
    key: "assets",
    defaultLabel: "Assets",
    description: "Shared files and creative assets.",
    href: "/portal/assets",
    capability: { kind: "client-hq", moduleId: "assets" },
    emptyTitle: "No assets yet",
    emptyLead: "Shared files will appear here when they are ready.",
  },
  {
    key: "settings",
    defaultLabel: "Settings",
    description: "Workspace account settings.",
    href: "/portal/settings",
    capability: { kind: "client-hq", moduleId: "settings" },
    emptyTitle: "Settings",
    emptyLead: "Manage your workspace preferences here.",
  },
];

export function getWorkspaceModuleDefinition(
  key: WorkspaceModuleKey,
): WorkspaceModuleDefinition | undefined {
  return WORKSPACE_MODULE_REGISTRY.find((m) => m.key === key);
}

export function assertWorkspaceModuleRegistryIntegrity(): void {
  const keys = new Set<string>();
  const hrefs = new Set<string>();
  for (const mod of WORKSPACE_MODULE_REGISTRY) {
    if (keys.has(mod.key)) {
      throw new Error(`Duplicate workspace module key: ${mod.key}`);
    }
    keys.add(mod.key);
    if (!mod.href.startsWith("/portal")) {
      throw new Error(`Unsafe workspace module href: ${mod.href}`);
    }
    hrefs.add(mod.href);
  }
}
