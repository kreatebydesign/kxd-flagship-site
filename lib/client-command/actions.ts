import { getClientQuickActions } from "@/lib/quick-actions";
import type { CommandQuickAction } from "./types";

export function buildQuickActions(clientId: number): CommandQuickAction[] {
  return getClientQuickActions(clientId).map((action) => ({
    label: action.label,
    sub: action.sub,
    href: action.href,
  }));
}
