import type { OperationsNavId, OperationsNavItem } from "@/components/admin/operations/shared/operations-nav";
import { NAV_GROUPS } from "@/components/admin/operations/shared/operations-nav";
import type { ClientHqNavId } from "@/lib/portal/nav";
import type { QuickAction, QuickActionId } from "@/lib/quick-actions/types";
import type { CommandSearchResult } from "@/lib/search/types";
import { getConfiguredEditionId } from "./configuration";
import { getEditionById } from "./registry";
import { isModuleEnabledForEdition } from "./modules";
import type { EditionDefinition, EditionResolvedNavigation, KxdModuleId } from "./types";

export const OPERATIONS_NAV_MODULE_MAP: Record<OperationsNavId, KxdModuleId> = {
  executive: "reporting",
  command: "operations",
  platform: "operations",
  today: "operations",
  founder: "founder",
  "founder-intelligence": "brain",
  brain: "brain",
  integrations: "integrations",
  clients: "portfolio",
  strategy: "strategy",
  accounts: "portfolio",
  onboarding: "onboarding",
  "portal-access": "client-hq",
  "client-success": "client-success",
  creative: "creative",
  reels: "creative",
  audits: "audits",
  infrastructure: "infrastructure",
  timeline: "timeline",
  automation: "automation",
  work: "work",
  "review-inbox": "work",
  playbooks: "playbooks",
  growth: "growth",
  reports: "reporting",
  "sales-pipeline": "sales",
  "sales-leads": "sales",
  "sales-proposals": "sales",
  "sales-templates": "sales",
  "sales-activities": "sales",
  "sales-forecast": "sales",
  "client-import": "portfolio",
  "client-launch": "portfolio",
  genesis: "onboarding",
  "launch-qa": "work",
};

export const PORTAL_NAV_MODULE_MAP: Record<ClientHqNavId, KxdModuleId> = {
  overview: "client-hq",
  projects: "client-hq",
  deliverables: "client-hq",
  requests: "client-hq",
  assets: "client-hq",
  invoices: "sales",
  meetings: "timeline",
  analytics: "reporting",
  reports: "reporting",
  "website-health": "infrastructure",
  resources: "client-hq",
  team: "client-hq",
  settings: "client-hq",
  advisor: "brain",
};

export const QUICK_ACTION_MODULE_MAP: Record<QuickActionId, KxdModuleId> = {
  "create-proposal": "sales",
  "create-executive-note": "strategy",
  "generate-report": "reporting",
  "launch-playbook": "playbooks",
  "run-website-audit": "audits",
  "open-client-command-center": "portfolio",
  "open-notifications": "notifications",
  "open-brain": "brain",
  "open-sales-pipeline": "sales",
  "open-client-success": "client-success",
  "open-integrations": "integrations",
  "open-work-board": "work",
  "create-task": "work",
  "complete-task": "work",
  "move-task-review": "work",
  "mark-waiting-client": "work",
  "mark-task-blocked": "work",
  "open-command-center": "portfolio",
  "open-client-hq": "client-hq",
  "open-timeline": "timeline",
  "open-infrastructure": "infrastructure",
  "generate-monthly-report": "reporting",
  "launch-website-playbook": "playbooks",
  "launch-quarterly-review": "playbooks",
  "create-success-check-in": "client-success",
};

export const SEARCH_PROVIDER_MODULE_MAP: Record<string, KxdModuleId> = {
  navigation: "operations",
  clients: "portfolio",
  projects: "work",
  sales: "sales",
  reports: "reporting",
  infrastructure: "infrastructure",
  creative: "creative",
  strategy: "strategy",
  playbooks: "playbooks",
  "client-success": "client-success",
  "client-tasks": "work",
  genesis: "onboarding",
  "launch-qa": "work",
  integrations: "integrations",
  automation: "automation",
  brain: "brain",
  "portal-users": "client-hq",
  "brand-kits": "creative",
  "creative-assets": "creative",
};

export function resolveEditionNavigation(edition: EditionDefinition): EditionResolvedNavigation {
  const hideOps = new Set(edition.customNavigation?.hideOperationsNavIds ?? []);
  const hidePortal = new Set(edition.customNavigation?.hidePortalNavIds ?? []);
  const labelOverrides = edition.customNavigation?.portalNavLabels ?? {};

  const operationsNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (hideOps.has(item.id)) return false;
      const moduleId = OPERATIONS_NAV_MODULE_MAP[item.id];
      return moduleId ? isModuleEnabledForEdition(moduleId, edition) : true;
    }),
  })).filter((group) => group.items.length > 0);

  const additional = edition.customNavigation?.additionalOperationsItems ?? [];
  const operationsNavItems = [
    ...operationsNavGroups.flatMap((g) => g.items),
    ...additional,
  ];

  return {
    operationsNavGroups,
    operationsNavItems,
    homeRoute: edition.customNavigation?.homeRoute ?? "/admin/operations/executive",
    portalNavHiddenIds: [...hidePortal],
    portalNavLabels: labelOverrides,
  };
}

export function filterEditionQuickActions(
  actions: QuickAction[],
  edition?: EditionDefinition,
): QuickAction[] {
  const ed = edition ?? getEditionById(getConfiguredEditionId());
  const editionActions = ed.customQuickActions ?? [];
  const merged = [...actions, ...editionActions];
  const seen = new Set<string>();

  return merged.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    const moduleId = QUICK_ACTION_MODULE_MAP[action.id];
    if (!moduleId) return true;
    return isModuleEnabledForEdition(moduleId, ed);
  });
}

export function filterEditionSearchResults(
  results: CommandSearchResult[],
  edition?: EditionDefinition,
): CommandSearchResult[] {
  const ed = edition ?? getEditionById(getConfiguredEditionId());

  return results.filter((result) => {
    if (result.type === "command") {
      const actionId = result.id.replace(/^cmd-/, "") as QuickActionId;
      const mod = QUICK_ACTION_MODULE_MAP[actionId];
      if (mod) return isModuleEnabledForEdition(mod, ed);
      return true;
    }

    if (result.type === "nav") {
      const navId = result.id.replace(/^nav-/, "") as OperationsNavId;
      const mod = OPERATIONS_NAV_MODULE_MAP[navId];
      if (mod) return isModuleEnabledForEdition(mod, ed);
      return true;
    }

    return true;
  });
}

export function getEditionOperationsNavGroups(edition?: EditionDefinition): typeof NAV_GROUPS {
  const ed = edition ?? getEditionById(getConfiguredEditionId());
  return resolveEditionNavigation(ed).operationsNavGroups;
}

export function getEditionOperationsNavItems(edition?: EditionDefinition): OperationsNavItem[] {
  const ed = edition ?? getEditionById(getConfiguredEditionId());
  return resolveEditionNavigation(ed).operationsNavItems;
}

export function isPortalNavEnabled(navId: ClientHqNavId, edition?: EditionDefinition): boolean {
  const ed = edition ?? getEditionById(getConfiguredEditionId());
  if (ed.customNavigation?.hidePortalNavIds?.includes(navId)) return false;
  const moduleId = PORTAL_NAV_MODULE_MAP[navId];
  return isModuleEnabledForEdition(moduleId, ed);
}

export function isSearchProviderEnabled(
  providerId: string,
  edition?: EditionDefinition,
): boolean {
  const ed = edition ?? getEditionById(getConfiguredEditionId());
  const mod = SEARCH_PROVIDER_MODULE_MAP[providerId];
  if (!mod) return true;
  return isModuleEnabledForEdition(mod, ed);
}
