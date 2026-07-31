/**
 * Canonical lifecycle transition tables for billing-plan / obligation / recurring.
 * Proposal and contract transitions remain in proposal-builder/lifecycle.ts.
 */

import type {
  BillingPlanStatus,
  InvoiceObligationStatus,
  RecurringScheduleStatus,
} from "./types.ts";
import {
  assertContractTransition,
  assertProposalTransition,
  canTransitionContract,
  canTransitionProposal,
} from "../proposal-builder/lifecycle.ts";

export {
  assertContractTransition,
  assertProposalTransition,
  canTransitionContract,
  canTransitionProposal,
};

const BILLING_PLAN_TRANSITIONS: Record<BillingPlanStatus, BillingPlanStatus[]> = {
  "pending-contract-execution": ["preparing", "blocked", "cancelled"],
  preparing: ["blocked", "ready-for-review", "cancelled"],
  blocked: ["preparing", "ready-for-review", "cancelled"],
  "ready-for-review": ["approved", "blocked", "cancelled"],
  approved: ["partially-activated", "active", "cancelled"],
  "partially-activated": ["active", "completed", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const OBLIGATION_TRANSITIONS: Record<InvoiceObligationStatus, InvoiceObligationStatus[]> = {
  "pending-trigger": ["draft-ready", "paid", "void"],
  "draft-ready": ["under-review", "approved", "sent", "paid", "void"],
  "under-review": ["approved", "draft-ready", "paid", "void"],
  approved: ["sent", "paid", "void"],
  sent: ["viewed", "paid", "overdue", "void", "uncollectible"],
  viewed: ["paid", "overdue", "void", "uncollectible"],
  paid: [],
  overdue: ["paid", "void", "uncollectible"],
  void: [],
  uncollectible: [],
};

const RECURRING_TRANSITIONS: Record<RecurringScheduleStatus, RecurringScheduleStatus[]> = {
  "pending-trigger": ["ready-for-review", "cancelled"],
  "ready-for-review": ["approved-pending-start", "cancelled"],
  "approved-pending-start": ["active", "cancelled"],
  active: ["paused", "cancelled", "completed"],
  paused: ["active", "cancelled"],
  cancelled: [],
  completed: [],
};

export function canTransitionBillingPlan(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = BILLING_PLAN_TRANSITIONS[from as BillingPlanStatus];
  return Boolean(allowed?.includes(to as BillingPlanStatus));
}

export function assertBillingPlanTransition(from: string, to: string): void {
  if (from === to) return;
  if (!canTransitionBillingPlan(from, to)) {
    throw new Error(`Invalid billing-plan transition: ${from} → ${to}`);
  }
}

export function canTransitionObligation(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = OBLIGATION_TRANSITIONS[from as InvoiceObligationStatus];
  return Boolean(allowed?.includes(to as InvoiceObligationStatus));
}

export function assertObligationTransition(from: string, to: string): void {
  if (from === to) return;
  if (!canTransitionObligation(from, to)) {
    throw new Error(`Invalid obligation transition: ${from} → ${to}`);
  }
}

export function canTransitionRecurring(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = RECURRING_TRANSITIONS[from as RecurringScheduleStatus];
  return Boolean(allowed?.includes(to as RecurringScheduleStatus));
}

export function assertRecurringTransition(from: string, to: string): void {
  if (from === to) return;
  if (!canTransitionRecurring(from, to)) {
    throw new Error(`Invalid recurring-schedule transition: ${from} → ${to}`);
  }
}

/** Protected local proposal — never send or simulate-send. */
export {
  PROTECTED_PROPOSAL_ID,
  assertNotProtectedProposal,
} from "../proposal-builder/protection.ts";

export function assertContractMutable(status: string): void {
  if (["executed", "voided", "superseded", "archived"].includes(status)) {
    throw new Error(`Contract status ${status} is sealed and cannot be mutated.`);
  }
}
