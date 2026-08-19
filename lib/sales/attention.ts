/**
 * Derived commercial attention — no duplicate reminder collection.
 */

import {
  isSameLocalDay,
  SALES_FOLLOW_UP_POLICY,
} from "./follow-up-policy";
import type { NextAction } from "./next-action";

export type AttentionKind =
  | "overdue-response"
  | "overdue"
  | "respond-today"
  | "proposal-idle"
  | "stale"
  | "due-today"
  | "scheduled";

export type AttentionInput = {
  status: string;
  nextAction: NextAction;
  nextFollowUp: string | null;
  createdAt: string;
  lastMeaningfulAt: string | null;
  now?: Date;
};

export function isOpenCommercialStatus(status: string): boolean {
  return status !== "won" && status !== "lost";
}

export function isIntentionallyWaiting(
  nextAction: NextAction,
  nextFollowUp: string | null,
  now = new Date(),
): boolean {
  if (nextAction !== "waiting-on-prospect") return false;
  if (!nextFollowUp) return false;
  const due = Date.parse(nextFollowUp);
  return Number.isFinite(due) && due > now.getTime();
}

export function isOverdue(
  nextFollowUp: string | null,
  now = new Date(),
): boolean {
  if (!nextFollowUp) return false;
  const due = Date.parse(nextFollowUp);
  return Number.isFinite(due) && due < now.getTime();
}

export function isDueToday(
  nextFollowUp: string | null,
  now = new Date(),
): boolean {
  if (!nextFollowUp) return false;
  return isSameLocalDay(nextFollowUp, now);
}

export function isStale(input: AttentionInput): boolean {
  const now = input.now ?? new Date();
  if (!isOpenCommercialStatus(input.status)) return false;
  if (isIntentionallyWaiting(input.nextAction, input.nextFollowUp, now)) {
    return false;
  }
  const last = Date.parse(input.lastMeaningfulAt || input.createdAt);
  if (!Number.isFinite(last)) return false;
  const ageDays = (now.getTime() - last) / (1000 * 60 * 60 * 24);
  return ageDays >= SALES_FOLLOW_UP_POLICY.staleOpenDays;
}

export function isProposalIdle(input: AttentionInput): boolean {
  const now = input.now ?? new Date();
  if (!["proposal", "negotiation"].includes(input.status)) return false;
  if (isIntentionallyWaiting(input.nextAction, input.nextFollowUp, now)) {
    return false;
  }
  const last = Date.parse(input.lastMeaningfulAt || input.createdAt);
  if (!Number.isFinite(last)) return false;
  const ageDays = (now.getTime() - last) / (1000 * 60 * 60 * 24);
  return ageDays >= SALES_FOLLOW_UP_POLICY.proposalIdleDays;
}

export function deriveAttentionKind(input: AttentionInput): AttentionKind | null {
  const now = input.now ?? new Date();
  if (!isOpenCommercialStatus(input.status)) return null;

  const overdue = isOverdue(input.nextFollowUp, now);
  const respondToday = input.nextAction === "respond-today";
  const hiddenNone = input.nextAction === "none";
  const waitingWithoutDate =
    input.nextAction === "waiting-on-prospect" && !input.nextFollowUp;

  if ((overdue || hiddenNone || waitingWithoutDate) && respondToday) {
    return "overdue-response";
  }
  if (overdue || hiddenNone || waitingWithoutDate) {
    return respondToday ? "overdue-response" : "overdue";
  }
  if (respondToday) return "respond-today";
  if (isProposalIdle(input) || input.nextAction === "send-proposal") {
    if (isProposalIdle(input)) return "proposal-idle";
  }
  if (isStale(input)) return "stale";
  if (isDueToday(input.nextFollowUp, now)) return "due-today";
  if (isIntentionallyWaiting(input.nextAction, input.nextFollowUp, now)) {
    return null;
  }
  return "scheduled";
}

/** Lower is more urgent. */
export function attentionRank(kind: AttentionKind | null, nextAction: NextAction): number {
  switch (kind) {
    case "overdue-response":
      return 10;
    case "overdue":
      return 20;
    case "respond-today":
      return 30;
    case "proposal-idle":
      return 40;
    case "stale":
      return 50;
    case "due-today":
      return 60;
    case "scheduled":
      return 70 + (nextAction === "none" ? 0 : 5);
    default:
      return 90;
  }
}

export const ATTENTION_KIND_LABEL: Record<AttentionKind, string> = {
  "overdue-response": "Respond now",
  overdue: "Overdue",
  "respond-today": "Respond today",
  "proposal-idle": "Proposal idle",
  stale: "Stale",
  "due-today": "Due today",
  scheduled: "Scheduled",
};
