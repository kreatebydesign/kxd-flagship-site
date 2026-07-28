/**
 * Safe action catalog — every href must be an allowlisted /portal destination.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import { isClientHqModuleEnabled } from "@/lib/portal/modules";
import type { WorkspaceAction } from "./types";
import { sanitizePortalHref } from "./safe-routes";

type ActionDefinition = WorkspaceAction & {
  requires?:
    | { kind: "ces"; moduleId: Parameters<typeof isCesModuleEnabled>[1] }
    | { kind: "client-hq"; moduleId: Parameters<typeof isClientHqModuleEnabled>[0] }
    | { kind: "always" };
};

const ACTION_CATALOG: ActionDefinition[] = [
  {
    id: "review-website",
    label: "Review Website",
    href: "/portal/website-review",
    description: "Open Website Review",
    requires: { kind: "ces", moduleId: "website-review" },
  },
  {
    id: "start-website-review",
    label: "Start Website Review",
    href: "/portal/website-review/request",
    description: "Submit a new website revision request",
    requires: { kind: "ces", moduleId: "website-review" },
  },
  {
    id: "open-website-workspace",
    label: "Open Website Workspace",
    href: "/portal/website-workspace",
    description: "Request page-level website updates",
    requires: { kind: "ces", moduleId: "website-workspace" },
  },
  {
    id: "view-inventory",
    label: "Open Inventory",
    href: "/portal/inventory",
    description: "Manage public listings",
    requires: { kind: "ces", moduleId: "inventory" },
  },
  {
    id: "open-requests",
    label: "Open requests",
    href: "/portal/requests",
    description: "View and submit partnership requests",
    requires: { kind: "client-hq", moduleId: "requests" },
  },
  {
    id: "view-deliverables",
    label: "View deliverables",
    href: "/portal/deliverables",
    description: "See shared deliverables",
    requires: { kind: "client-hq", moduleId: "deliverables" },
  },
  {
    id: "view-reports",
    label: "View reports",
    href: "/portal/reports",
    description: "Open published reports",
    requires: { kind: "client-hq", moduleId: "reports" },
  },
  {
    id: "open-settings",
    label: "Workspace settings",
    href: "/portal/settings",
    description: "Manage workspace preferences",
    requires: { kind: "client-hq", moduleId: "settings" },
  },
];

function isActionAvailable(
  action: ActionDefinition,
  profile: ResolvedExperienceProfile,
): boolean {
  const href = sanitizePortalHref(action.href);
  if (!href) return false;
  const requires = action.requires ?? { kind: "always" as const };
  if (requires.kind === "always") return true;
  if (requires.kind === "ces") return isCesModuleEnabled(profile, requires.moduleId);
  if (requires.kind === "client-hq") return isClientHqModuleEnabled(requires.moduleId);
  return false;
}

export function resolveWorkspaceActions(
  profile: ResolvedExperienceProfile,
  actionIds: string[],
): WorkspaceAction[] {
  const selected: WorkspaceAction[] = [];
  const seen = new Set<string>();

  for (const id of actionIds) {
    if (seen.has(id)) continue;
    const def = ACTION_CATALOG.find((a) => a.id === id);
    if (!def) continue;
    if (!isActionAvailable(def, profile)) continue;
    const href = sanitizePortalHref(def.href);
    if (!href) continue;
    seen.add(id);
    selected.push({
      id: def.id,
      label: def.label,
      href,
      description: def.description,
    });
  }

  return selected;
}

export function listActionCatalogForVerification(): ActionDefinition[] {
  return ACTION_CATALOG.slice();
}
