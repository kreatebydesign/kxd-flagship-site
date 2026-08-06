import {
  LEGACY_COMMERCIAL_TAB_REDIRECTS,
  commercialWorkspaceHref,
} from "./commercial/sections";
import type { CommercialSectionId } from "./commercial/types";

/** Tabs shown in the client workspace nav. */
export const COMMAND_WORKSPACE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "requests", label: "Requests" },
  { id: "commercial", label: "Commercial" },
  { id: "files", label: "Files" },
  { id: "inventory", label: "Inventory" },
  { id: "domains", label: "Domains" },
  { id: "emails", label: "Communications" },
  { id: "intelligence", label: "Intelligence" },
  { id: "actions", label: "Actions" },
  { id: "meetings", label: "Meetings" },
  { id: "notes", label: "Notes" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
] as const;

/** Includes legacy commercial tab ids for bookmark resolution. */
export const COMMAND_WORKSPACE_TAB_IDS = [
  ...COMMAND_WORKSPACE_TABS.map((t) => t.id),
  "invoices",
  "retainers",
  "proposals",
  "contracts",
  "financial",
] as const;

export type CommandWorkspaceTabId = (typeof COMMAND_WORKSPACE_TABS)[number]["id"];
export type CommandWorkspaceTabIdOrLegacy = (typeof COMMAND_WORKSPACE_TAB_IDS)[number];

export function isCommandWorkspaceTabId(value: string | undefined): value is CommandWorkspaceTabId {
  return COMMAND_WORKSPACE_TABS.some((t) => t.id === value);
}

export function isLegacyCommercialTabId(
  value: string | undefined,
): value is keyof typeof LEGACY_COMMERCIAL_TAB_REDIRECTS {
  return Boolean(value && value in LEGACY_COMMERCIAL_TAB_REDIRECTS);
}

export function resolveWorkspaceTab(value: string | undefined): {
  tab: CommandWorkspaceTabId;
  commercialSection?: CommercialSectionId;
  legacyRedirectHref?: string;
  clientIdForRedirect?: never;
} {
  if (isLegacyCommercialTabId(value)) {
    return {
      tab: "commercial",
      commercialSection: LEGACY_COMMERCIAL_TAB_REDIRECTS[value],
    };
  }
  if (isCommandWorkspaceTabId(value)) {
    return { tab: value };
  }
  return { tab: "overview" };
}

export function commandWorkspaceHref(clientId: number, tab?: CommandWorkspaceTabId): string {
  const base = `/admin/operations/client-command/${clientId}`;
  if (!tab || tab === "overview") return base;
  if (tab === "commercial") return commercialWorkspaceHref(clientId, "overview");
  return `${base}?tab=${tab}`;
}

export function legacyCommercialRedirectHref(
  clientId: number,
  legacyTab: string,
): string | null {
  if (!isLegacyCommercialTabId(legacyTab)) return null;
  return commercialWorkspaceHref(clientId, LEGACY_COMMERCIAL_TAB_REDIRECTS[legacyTab]);
}
