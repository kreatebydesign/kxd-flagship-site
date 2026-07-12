import type {
  ExecutiveWorkspaceDefinition,
  ExecutiveWorkspaceId,
  QuickCreateAction,
  ExecutiveSearchScope,
} from "./types";

export const EXECUTIVE_WORKSPACE_STORAGE_PREFIX = "kxd-os-workspace-memory" as const;

export const EXECUTIVE_WORKSPACES: ExecutiveWorkspaceDefinition[] = [
  {
    id: "today",
    label: "Today",
    href: "/admin/operations/today",
    description: "Executive home",
  },
  {
    id: "work",
    label: "Work",
    href: "/admin/work",
    description: "Execution",
  },
  {
    id: "operations",
    label: "Operations",
    href: "/admin/operations/intelligence",
    description: "Full operating surface",
  },
  {
    id: "training",
    label: "Operations Experience",
    href: "/admin/training",
    description: "Learn to operate KXD OS",
  },
  {
    id: "sales",
    label: "Sales",
    href: "/admin/sales",
    description: "Pipeline and proposals",
  },
];

export const QUICK_CREATE_ACTIONS: QuickCreateAction[] = [
  {
    id: "create-work",
    label: "Work",
    description: "Open the Executive Work Composer",
    group: "work",
    event: "work-composer",
    available: true,
    shortcut: "W",
  },
  {
    id: "create-note",
    label: "Note",
    description: "Capture an executive note",
    group: "notes",
    event: "quick-note",
    available: true,
    shortcut: "N",
  },
  {
    id: "create-client",
    label: "Client",
    description: "Open client creation",
    group: "clients",
    href: "/admin/operations/clients",
    available: true,
  },
  {
    id: "create-review",
    label: "Review follow-up",
    description: "Open Review Inbox",
    group: "reviews",
    href: "/admin/operations/review-inbox",
    available: true,
  },
  {
    id: "create-communication",
    label: "Communication",
    description: "Reserved for communications compose",
    group: "communications",
    available: false,
  },
  {
    id: "create-invoice",
    label: "Invoice",
    description: "Reserved for invoice create",
    group: "finance",
    available: false,
  },
  {
    id: "create-proposal",
    label: "Proposal",
    description: "Open proposals",
    group: "finance",
    href: "/admin/sales/proposals/new",
    available: true,
  },
  {
    id: "create-training",
    label: "Training progress",
    description: "Open Operations Experience",
    group: "training",
    href: "/admin/training",
    available: true,
  },
  {
    id: "create-calendar",
    label: "Calendar",
    description: "Reserved for calendar create",
    group: "calendar",
    available: false,
  },
];

export const EXECUTIVE_SEARCH_SCOPES: ExecutiveSearchScope[] = [
  { id: "clients", label: "Clients", status: "active" },
  { id: "work", label: "Work", status: "active" },
  { id: "reviews", label: "Reviews", status: "active" },
  { id: "communications", label: "Communications", status: "reserved" },
  { id: "timeline", label: "Timeline", status: "active" },
  { id: "training", label: "Training", status: "reserved" },
  { id: "knowledge", label: "Knowledge", status: "reserved" },
  { id: "business-development", label: "Business Development", status: "reserved" },
  { id: "finance", label: "Finance", status: "reserved" },
  { id: "calendar", label: "Calendar", status: "reserved" },
];

export function resolveWorkspaceIdFromPath(pathname: string): ExecutiveWorkspaceId {
  if (pathname.startsWith("/admin/operations/today")) return "today";
  if (pathname.startsWith("/admin/work")) return "work";
  if (pathname.startsWith("/admin/training")) return "training";
  if (pathname.startsWith("/admin/sales")) return "sales";
  if (pathname.startsWith("/admin/operations/brief")) return "today";
  if (pathname.startsWith("/admin/operations/focus")) return "focus";
  if (pathname.startsWith("/admin/operations/review")) return "review";
  if (pathname.startsWith("/admin/operations")) return "operations";
  return "today";
}

export function workspaceLabel(id: ExecutiveWorkspaceId): string {
  return (
    EXECUTIVE_WORKSPACES.find((w) => w.id === id)?.label ??
    (id === "focus"
      ? "Focus"
      : id === "review"
        ? "Review"
        : id === "brief"
          ? "Today"
          : "Today")
  );
}
