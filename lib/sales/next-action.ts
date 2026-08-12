/**
 * First-class Next Action for sales opportunities.
 * Lightweight operator language — not a full task system.
 */

export const NEXT_ACTIONS = [
  { value: "respond-today", label: "Respond today", priority: 1 },
  { value: "follow-up-tomorrow", label: "Follow up tomorrow", priority: 2 },
  { value: "waiting-on-prospect", label: "Waiting on prospect", priority: 4 },
  { value: "send-proposal", label: "Send proposal", priority: 3 },
  { value: "review-scope", label: "Review scope", priority: 3 },
  { value: "none", label: "No action scheduled", priority: 9 },
] as const;

export type NextAction = (typeof NEXT_ACTIONS)[number]["value"];

export const NEXT_ACTION_LABEL: Record<NextAction, string> = Object.fromEntries(
  NEXT_ACTIONS.map((a) => [a.value, a.label]),
) as Record<NextAction, string>;

export const NEXT_ACTION_PRIORITY: Record<NextAction, number> = Object.fromEntries(
  NEXT_ACTIONS.map((a) => [a.value, a.priority]),
) as Record<NextAction, number>;

export function isNextAction(value: unknown): value is NextAction {
  return typeof value === "string" && NEXT_ACTIONS.some((a) => a.value === value);
}
