import type { CommandDefinition } from "./types";

/** Quick commands — matched before entity search results */
export const QUICK_COMMANDS: CommandDefinition[] = [
  {
    id: "cmd-new-proposal",
    title: "New Proposal",
    keywords: ["new proposal", "create proposal", "proposal"],
    href: "/admin/sales/proposals/new",
    group: "commands",
    icon: "◆",
    actionLabel: "Create",
  },
  {
    id: "cmd-new-report",
    title: "Generate Report",
    keywords: ["new report", "generate report", "report"],
    href: "/admin/operations/reports",
    group: "commands",
    icon: "◆",
    actionLabel: "Generate",
  },
  {
    id: "cmd-new-note",
    title: "New Executive Note",
    keywords: ["new note", "executive note", "strategy note"],
    href: "/admin/operations/strategy",
    group: "commands",
    icon: "◆",
    actionLabel: "Create",
  },
  {
    id: "cmd-new-project",
    title: "New Project",
    keywords: ["new project", "create project", "project"],
    href: "/admin/collections/client-projects/create",
    group: "commands",
    icon: "◆",
    actionLabel: "Create",
  },
  {
    id: "cmd-new-client",
    title: "Launch Client",
    keywords: ["new client", "launch client", "client launch"],
    href: "/admin/operations/client-launch",
    group: "commands",
    icon: "◆",
    actionLabel: "Launch",
  },
  {
    id: "cmd-run-audit",
    title: "Run Website Audit",
    keywords: ["run audit", "website audit", "audit"],
    href: "/admin/operations/audits",
    group: "commands",
    icon: "◆",
    actionLabel: "Open",
  },
  {
    id: "cmd-command-center",
    title: "Open Command Center",
    keywords: ["command center", "operations", "open command"],
    href: "/admin/operations/command",
    group: "commands",
    icon: "◆",
    actionLabel: "Open",
  },
  {
    id: "cmd-notifications",
    title: "Open Notifications",
    keywords: ["open notifications", "notifications", "inbox", "notification center", "alerts"],
    href: "#notifications",
    group: "commands",
    icon: "◆",
    actionLabel: "Open",
  },
  {
    id: "cmd-brain",
    title: "Open KXD Brain",
    keywords: ["brain", "kxd brain", "intelligence"],
    href: "/admin/operations/brain",
    group: "commands",
    icon: "◆",
    actionLabel: "Open",
  },
  {
    id: "cmd-client-hq",
    title: "Open Client HQ",
    keywords: ["client hq", "client command", "client headquarters"],
    href: "/admin/operations/clients",
    group: "commands",
    icon: "◆",
    actionLabel: "Browse",
  },
  {
    id: "cmd-meeting",
    title: "Create Meeting",
    keywords: ["create meeting", "new meeting", "meeting"],
    href: "/admin/operations/timeline",
    group: "commands",
    icon: "◆",
    actionLabel: "Schedule",
  },
  {
    id: "cmd-import",
    title: "Import Client",
    keywords: ["import client", "client import"],
    href: "/admin/operations/client-import",
    group: "commands",
    icon: "◆",
    actionLabel: "Import",
  },
  {
    id: "cmd-sales-pipeline",
    title: "Open Sales Pipeline",
    keywords: ["sales", "pipeline", "leads"],
    href: "/admin/sales",
    group: "commands",
    icon: "◆",
    actionLabel: "Open",
  },
];

export function matchCommands(query: string, limit = 8): CommandDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return QUICK_COMMANDS.slice(0, 6);

  return QUICK_COMMANDS.filter((cmd) => {
    if (cmd.title.toLowerCase().includes(q)) return true;
    return cmd.keywords.some((kw) => kw.includes(q) || q.includes(kw));
  }).slice(0, limit);
}

export function commandsToResults(matches: CommandDefinition[]) {
  return matches.map((cmd) => ({
    id: cmd.id,
    type: "command" as const,
    group: cmd.group,
    title: cmd.title,
    subtitle: "Quick command",
    href: cmd.href,
    actionLabel: cmd.actionLabel ?? "Run",
    icon: cmd.icon,
  }));
}
