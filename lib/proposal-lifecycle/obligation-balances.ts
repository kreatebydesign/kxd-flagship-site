/**
 * Obligation balance helpers — paid / remaining / display status.
 * Pure functions; no Stripe; no DB.
 *
 * Canonical paid-amount precedence (Batch A):
 * 1. Sum of paymentEvents when any events exist (events are authoritative)
 * 2. Positive persisted amountPaidCents
 * 3. status === "paid" → full obligation amount (legacy / provider compatibility)
 * 4. Valid paymentReceipt.amountCents > 0
 * 5. Else 0
 *
 * Default amountPaidCents: 0 must NEVER erase stronger paid evidence.
 */

import type { InvoiceObligation, InvoiceObligationStatus } from "./types.ts";
import type { ObligationPaymentEvent } from "./external-obligation-payment.ts";

const TERMINAL_CLOSED = new Set<InvoiceObligationStatus>(["void", "uncollectible"]);

function asNonNegativeIntCents(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return 0;
  return n;
}

function capPaidToObligation(paidCents: number, obligationAmountCents: number): number {
  const amount = asNonNegativeIntCents(obligationAmountCents);
  const paid = asNonNegativeIntCents(paidCents);
  return Math.min(paid, amount);
}

export function sumPaymentEventsCents(
  events: ObligationPaymentEvent[] | null | undefined,
): number {
  if (!events?.length) return 0;
  let sum = 0;
  for (const event of events) {
    sum += asNonNegativeIntCents(event.amountCents);
  }
  return sum;
}

/**
 * Authoritative amount already applied to an obligation.
 * Integer cents only. Never exceeds obligation.amountCents.
 */
export function obligationAmountPaidCents(obligation: InvoiceObligation): number {
  const amount = asNonNegativeIntCents(obligation.amountCents);
  const events = obligation.paymentEvents;

  // Events present → events are the ledger (even when sum is 0 after a wipe).
  if (Array.isArray(events) && events.length > 0) {
    return capPaidToObligation(sumPaymentEventsCents(events), amount);
  }

  // Positive cached paid amount only — never treat default 0 as conclusive.
  const cached = obligation.amountPaidCents;
  if (typeof cached === "number" && Number.isInteger(cached) && cached > 0) {
    return capPaidToObligation(cached, amount);
  }

  // Legacy / provider: fully paid status without events or positive cache.
  if (obligation.status === "paid") {
    return amount;
  }

  const receiptPaid = obligation.paymentReceipt?.amountCents;
  if (typeof receiptPaid === "number" && Number.isInteger(receiptPaid) && receiptPaid > 0) {
    return capPaidToObligation(receiptPaid, amount);
  }

  return 0;
}

export function obligationRemainingCents(obligation: InvoiceObligation): number {
  if (TERMINAL_CLOSED.has(obligation.status)) return 0;
  const amount = asNonNegativeIntCents(obligation.amountCents);
  return Math.max(0, amount - obligationAmountPaidCents(obligation));
}

/** True when the obligation is fully settled. */
export function obligationIsPaid(obligation: InvoiceObligation): boolean {
  if (TERMINAL_CLOSED.has(obligation.status)) return false;
  const amount = asNonNegativeIntCents(obligation.amountCents);
  const paid = obligationAmountPaidCents(obligation);
  if (amount === 0) return obligation.status === "paid" || paid === 0;
  return paid >= amount;
}

export function isObligationOpenForExternalPayment(obligation: InvoiceObligation): boolean {
  if (TERMINAL_CLOSED.has(obligation.status)) return false;
  if (obligation.collectionChannel === "stripe-collected") return false;
  if (obligation.paymentReceipt?.collectionChannel === "stripe-collected") return false;
  return obligationRemainingCents(obligation) > 0;
}

/** Derive lifecycle status from balances without inventing Stripe collection. */
export function deriveObligationPaymentStatus(
  obligation: InvoiceObligation,
): InvoiceObligationStatus {
  if (TERMINAL_CLOSED.has(obligation.status)) return obligation.status;
  const paid = obligationAmountPaidCents(obligation);
  const remaining = Math.max(0, asNonNegativeIntCents(obligation.amountCents) - paid);
  if (paid <= 0) {
    return obligation.status === "partially-paid" ? "pending-trigger" : obligation.status;
  }
  if (remaining <= 0) return "paid";
  return "partially-paid";
}

export function formatObligationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    "pending-trigger": "Pending trigger",
    "draft-ready": "Draft ready",
    "under-review": "Under review",
    approved: "Approved",
    sent: "Sent",
    viewed: "Viewed",
    "partially-paid": "Partially paid",
    paid: "Paid",
    overdue: "Overdue",
    void: "Void",
    uncollectible: "Uncollectible",
  };
  return map[status] ?? status.replace(/-/g, " ");
}

/**
 * Earliest-first FIFO across open obligations.
 * Sort: dueDate ascending (nulls last), then existing array order.
 * When allowedObligationIds is provided, only those obligations may receive funds.
 */
export function planFifoAllocation(
  obligations: InvoiceObligation[],
  amountCents: number,
  options?: { allowedObligationIds?: string[] },
): Array<{ obligationId: string; amountCents: number; label: string }> {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return [];

  const allowed =
    options?.allowedObligationIds && options.allowedObligationIds.length > 0
      ? new Set(options.allowedObligationIds.map(String))
      : null;

  const indexed = obligations.map((obligation, index) => ({ obligation, index }));
  indexed.sort((a, b) => {
    const aDate = a.obligation.dueDate ?? "9999-99-99";
    const bDate = b.obligation.dueDate ?? "9999-99-99";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return a.index - b.index;
  });

  let remaining = amountCents;
  const allocations: Array<{ obligationId: string; amountCents: number; label: string }> = [];

  for (const { obligation } of indexed) {
    if (remaining <= 0) break;
    if (allowed && !allowed.has(obligation.id)) continue;
    if (!isObligationOpenForExternalPayment(obligation)) continue;
    const open = obligationRemainingCents(obligation);
    if (open <= 0) continue;
    const apply = Math.min(open, remaining);
    allocations.push({
      obligationId: obligation.id,
      amountCents: apply,
      label: obligation.label,
    });
    remaining -= apply;
  }

  return allocations;
}

export function sumObligationAmountCents(obligations: InvoiceObligation[]): number {
  return obligations.reduce((sum, o) => sum + asNonNegativeIntCents(o.amountCents), 0);
}

export function sumObligationPaidCents(obligations: InvoiceObligation[]): number {
  return obligations.reduce((sum, o) => sum + obligationAmountPaidCents(o), 0);
}

export function sumProjectObligationRemainingCents(
  obligations: InvoiceObligation[],
): number {
  return obligations
    .filter((o) => o.kind === "initial" || o.kind === "milestone" || o.kind === "final")
    .reduce((sum, o) => sum + obligationRemainingCents(o), 0);
}

export function sumOpenObligationRemainingCents(obligations: InvoiceObligation[]): number {
  return obligations.reduce((sum, o) => sum + obligationRemainingCents(o), 0);
}

/**
 * Launch / milestone commencement triggers that mean the obligation is
 * contractually present but not yet currently due until the trigger fires
 * (or the obligation advances past pending-trigger via issuance/payment).
 */
const LAUNCH_GATED_TRIGGERS = new Set([
  "website-launch",
  "after-launch-verified",
  "launch-verified",
  "after-launch",
]);

export function isLaunchGatedObligationTrigger(trigger: string | null | undefined): boolean {
  const normalized = String(trigger ?? "")
    .trim()
    .toLowerCase();
  return LAUNCH_GATED_TRIGGERS.has(normalized);
}

function normalizeAsOfDate(asOfDate: string): string {
  const raw = String(asOfDate || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(asOfDate);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/**
 * Whether an open remaining balance is *currently* outstanding / payable
 * as of a statement date — distinct from contractual remaining.
 *
 * Rules (system-wide, not client-specific):
 * - No remaining / terminal closed → not outstanding
 * - partially-paid / overdue / issued(sent|viewed|approved|under-review|draft-ready)
 *   → currently outstanding (collection already in motion)
 * - Launch-gated trigger still at pending-trigger → not yet due
 * - Calendar dueDate → currently due when asOf >= dueDate; else upcoming
 * - No dueDate, not launch-gated → currently due (e.g. project progress / activated now)
 */
export function isObligationCurrentlyOutstanding(
  obligation: InvoiceObligation,
  asOfDate: string,
): boolean {
  if (obligationRemainingCents(obligation) <= 0) return false;
  if (TERMINAL_CLOSED.has(obligation.status)) return false;

  const status = obligation.status;
  if (
    status === "partially-paid" ||
    status === "overdue" ||
    status === "sent" ||
    status === "viewed" ||
    status === "approved" ||
    status === "under-review" ||
    status === "draft-ready"
  ) {
    return true;
  }

  // pending-trigger (and any other early open status with remaining)
  if (status === "pending-trigger" && isLaunchGatedObligationTrigger(obligation.trigger)) {
    return false;
  }

  const dueDate = obligation.dueDate?.trim().slice(0, 10) || null;
  if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return dueDate <= normalizeAsOfDate(asOfDate);
  }

  // Immediate / activated without a conventional due date — include.
  // Launch-gated cases without dueDate already returned false above.
  return true;
}

export function sumCurrentlyOutstandingCents(
  obligations: InvoiceObligation[],
  asOfDate: string,
): number {
  return obligations.reduce((sum, obligation) => {
    if (!isObligationCurrentlyOutstanding(obligation, asOfDate)) return sum;
    return sum + obligationRemainingCents(obligation);
  }, 0);
}

/** Aggregate account totals — always satisfies total = paid + remaining for open ledger rows. */
export function aggregateObligationBalances(obligations: InvoiceObligation[]): {
  totalCents: number;
  paidCents: number;
  remainingCents: number;
} {
  const totalCents = sumObligationAmountCents(obligations);
  const paidCents = sumObligationPaidCents(obligations);
  const remainingCents = sumOpenObligationRemainingCents(obligations);
  return { totalCents, paidCents, remainingCents };
}
