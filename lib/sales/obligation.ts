/**
 * Commercial obligation guards — next action + clock on sales-leads.
 */

import type { NextAction } from "./next-action";
import { defaultDueForNextAction } from "./follow-up-policy";
import { isOpenCommercialStatus } from "./attention";
import { isLostReason, type LostReason } from "./follow-up-policy";

export type ObligationPatch = {
  status?: string;
  nextAction?: NextAction;
  nextFollowUp?: string | null;
  nextActionNote?: string | null;
  lostReason?: LostReason | null;
};

export type ObligationValidation =
  | { ok: true; data: ObligationPatch }
  | { ok: false; message: string };

export function resolveFollowUpClock(input: {
  nextAction: NextAction;
  explicitFollowUp?: string | null;
  now?: Date;
}): { nextFollowUp: string | null; error?: string } {
  const explicit = input.explicitFollowUp?.trim() || null;
  if (input.nextAction === "waiting-on-prospect") {
    if (!explicit) {
      return {
        nextFollowUp: null,
        error: "Waiting on prospect requires a future follow-up date.",
      };
    }
    const due = Date.parse(explicit);
    if (!Number.isFinite(due) || due <= (input.now ?? new Date()).getTime()) {
      return {
        nextFollowUp: null,
        error: "Waiting on prospect requires a future follow-up date.",
      };
    }
    return { nextFollowUp: new Date(due).toISOString() };
  }

  if (explicit) {
    const due = Date.parse(explicit);
    if (!Number.isFinite(due)) {
      return { nextFollowUp: null, error: "Follow-up date is invalid." };
    }
    return { nextFollowUp: new Date(due).toISOString() };
  }

  const computed = defaultDueForNextAction(input.nextAction, input.now ?? new Date());
  return { nextFollowUp: computed ? computed.toISOString() : null };
}

export function validateObligationPatch(input: {
  currentStatus: string;
  currentNextAction: NextAction;
  patch: ObligationPatch;
  now?: Date;
}): ObligationValidation {
  const nextStatus = input.patch.status ?? input.currentStatus;
  const nextAction = input.patch.nextAction ?? input.currentNextAction;
  const data: ObligationPatch = { ...input.patch };

  if (nextStatus === "lost") {
    if (!isLostReason(input.patch.lostReason)) {
      return { ok: false, message: "Moving to Lost requires a reason." };
    }
    data.nextAction = "none";
    data.nextFollowUp = null;
    return { ok: true, data };
  }

  if (nextStatus === "won") {
    data.nextAction = "none";
    data.nextFollowUp = null;
    return { ok: true, data };
  }

  if (nextAction === "none" && isOpenCommercialStatus(nextStatus)) {
    return {
      ok: false,
      message: "Open opportunities need a next commercial obligation.",
    };
  }

  if (input.patch.nextAction != null || input.patch.nextFollowUp !== undefined) {
    const clock = resolveFollowUpClock({
      nextAction,
      explicitFollowUp: input.patch.nextFollowUp,
      now: input.now,
    });
    if (clock.error) return { ok: false, message: clock.error };
    data.nextFollowUp = clock.nextFollowUp;
    data.nextAction = nextAction;
  }

  return { ok: true, data };
}

export function shouldLogObligationChange(input: {
  prevAction: NextAction;
  nextAction: NextAction;
  prevFollowUp: string | null;
  nextFollowUp: string | null;
}): boolean {
  if (input.prevAction !== input.nextAction) return true;
  const prev = input.prevFollowUp ? Date.parse(input.prevFollowUp) : NaN;
  const next = input.nextFollowUp ? Date.parse(input.nextFollowUp) : NaN;
  if (!Number.isFinite(prev) && Number.isFinite(next)) return true;
  if (Number.isFinite(prev) && !Number.isFinite(next)) return true;
  if (Number.isFinite(prev) && Number.isFinite(next)) {
    return Math.abs(next - prev) >= 60 * 60 * 1000;
  }
  return false;
}
