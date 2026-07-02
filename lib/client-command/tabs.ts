export const COMMAND_WORKSPACE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "projects", label: "Projects" },
  { id: "requests", label: "Requests" },
  { id: "invoices", label: "Invoices" },
  { id: "retainers", label: "Retainers" },
  { id: "files", label: "Files" },
  { id: "domains", label: "Domains" },
  { id: "emails", label: "Communications" },
  { id: "intelligence", label: "Intelligence" },
  { id: "actions", label: "Actions" },
  { id: "proposals", label: "Proposals" },
  { id: "contracts", label: "Contracts" },
  { id: "financial", label: "Financial" },
  { id: "meetings", label: "Meetings" },
  { id: "notes", label: "Notes" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
] as const;

export type CommandWorkspaceTabId = (typeof COMMAND_WORKSPACE_TABS)[number]["id"];

export function isCommandWorkspaceTabId(value: string | undefined): value is CommandWorkspaceTabId {
  return COMMAND_WORKSPACE_TABS.some((t) => t.id === value);
}

export function commandWorkspaceHref(clientId: number, tab?: CommandWorkspaceTabId): string {
  const base = `/admin/operations/client-command/${clientId}`;
  return tab && tab !== "overview" ? `${base}?tab=${tab}` : base;
}
