import type { CommandDefinition } from "./types";
import { getGlobalQuickActions } from "@/lib/quick-actions";

/** Work board navigation commands */
export const WORK_NAV_COMMANDS: CommandDefinition[] = [
  {
    id: "cmd-open-work",
    title: "Open Work Board",
    keywords: ["open work", "work board", "work manager", "tasks"],
    href: "/admin/operations/work",
    group: "commands",
    icon: "▣",
    actionLabel: "Open",
  },
  {
    id: "cmd-new-task",
    title: "New Task",
    keywords: ["new task", "create task", "add task"],
    href: "/admin/collections/client-tasks/create",
    group: "commands",
    icon: "▣",
    actionLabel: "Create",
  },
  {
    id: "cmd-work-today",
    title: "Work Due Today",
    keywords: ["today", "due today", "work today"],
    href: "/admin/operations/work?view=due-today",
    group: "commands",
    icon: "▣",
    actionLabel: "View",
  },
  {
    id: "cmd-work-blocked",
    title: "Blocked Work",
    keywords: ["blocked", "blockers"],
    href: "/admin/operations/work?view=blocked",
    group: "commands",
    icon: "▣",
    actionLabel: "View",
  },
  {
    id: "cmd-work-waiting",
    title: "Waiting On Client",
    keywords: ["waiting", "waiting on client", "client waiting"],
    href: "/admin/operations/work?view=waiting-on-client",
    group: "commands",
    icon: "▣",
    actionLabel: "View",
  },
  {
    id: "cmd-work-review",
    title: "Work In Review",
    keywords: ["review", "in review"],
    href: "/admin/operations/work?view=kanban",
    group: "commands",
    icon: "▣",
    actionLabel: "View",
  },
];

/** Quick commands — matched before entity search results */
export const QUICK_COMMANDS: CommandDefinition[] = [
  ...getGlobalQuickActions().map((action) => ({
    id: `cmd-${action.id}`,
    title: action.label,
    keywords: action.keywords ?? [action.label.toLowerCase(), action.sub.toLowerCase()],
    href: action.href,
    group: "commands" as const,
    icon: "◆",
    actionLabel: action.sub,
  })),
  ...WORK_NAV_COMMANDS,
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
