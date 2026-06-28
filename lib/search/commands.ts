import type { CommandDefinition } from "./types";
import { getGlobalQuickActions } from "@/lib/quick-actions";

/** Quick commands — matched before entity search results */
export const QUICK_COMMANDS: CommandDefinition[] = getGlobalQuickActions().map((action) => ({
  id: `cmd-${action.id}`,
  title: action.label,
  keywords: action.keywords ?? [action.label.toLowerCase(), action.sub.toLowerCase()],
  href: action.href,
  group: "commands" as const,
  icon: "◆",
  actionLabel: action.sub,
}));

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
