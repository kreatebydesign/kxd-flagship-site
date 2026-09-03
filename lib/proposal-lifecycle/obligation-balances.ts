/**
 * Obligation balance helpers — paid / remaining / display status.
 * Pure functions; no Stripe; no DB.
 */

import type { InvoiceObligation, InvoiceObligationStatus } from "./types.ts";
import type { ObligationPaymentEvent } from "./external-obligation-payment.ts";

const TERMINAL_CLOSED = new Set<InvoiceObligationStatus>(["void", "uncollectible"]);

export function sumPaymentEventsCents(
  events: ObligationPaymentEvent[] | null | undefined,
): number {
  if (!events?.length) return 0;
  return events.reduce((sum, event) => sum + (Number(event.amountCents) || 0), 0);
}

/** Authoritative amount already applied to an obligation. */
export function obligationAmountPaidCents(obligation: InvoiceObligation): number {
  const fromEvents = sumPaymentEventsCents(obligation.paymentEvents);
  if (fromEvents > 0) return fromEvents;
  if (typeof obligation.amountPaidCents === "number" && obligation.amountPaidCents >= 0) {
    return obligation.amountPaidCents;
  }
  if (obligation.status === "paid") {
    return obligation.amountCents;
  }
  if (obligation.paymentReceipt?.amountCents) {
    return obligation.paymentReceipt.amountCents;
  }
  return 0;
}

export function obligationRemainingCents(obligation: InvoiceObligation): number {
  if (TERMINAL_CLOSED.has(obligation.status)) return 0;
  return Math.max(0, obligation.amountCents - obligationAmountPaidCents(obligation));
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
  const remaining = Math.max(0, obligation.amountCents - paid);
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
