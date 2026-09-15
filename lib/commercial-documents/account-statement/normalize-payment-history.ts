/**
 * Normalize obligation payment evidence into client-safe statement payments.
 *
 * Groups multiple allocation legs that share a paymentGroupId into one
 * client-facing payment row. Reusable by future receipt composition.
 *
 * Never exposes internal notes, idempotency keys, or DB internals.
 */

import type { InvoiceObligation } from "@/lib/proposal-lifecycle/types";
import type { ObligationPaymentEvent } from "@/lib/proposal-lifecycle/external-obligation-payment";

export type NormalizedStatementPayment = {
  /** Stable client-safe id (payment group or synthetic). */
  id: string;
  /** ISO calendar date YYYY-MM-DD */
  paidOn: string;
  amountCents: number;
  /** Client-facing description */
  label: string;
  method?: string | null;
  reference?: string | null;
  /** Obligation ids this payment settled (or partially settled). */
  obligationIds: string[];
};

function toCalendarDate(isoOrDate: string): string {
  const raw = String(isoOrDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return raw.slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

function methodLabel(method: string | null | undefined): string | null {
  if (!method) return null;
  const map: Record<string, string> = {
    stripe: "Stripe",
    "cash-app": "Cash App",
    zelle: "Zelle",
    ach: "ACH",
    check: "Check",
    cash: "Cash",
    wire: "Wire",
    other: "Other",
  };
  return map[method] ?? method.replace(/-/g, " ");
}

function isProjectKind(kind: InvoiceObligation["kind"]): boolean {
  return kind === "initial" || kind === "milestone" || kind === "final";
}

function defaultLabelForEvents(
  events: Array<{ obligation: InvoiceObligation; event: ObligationPaymentEvent }>,
): string {
  if (events.length === 1) {
    const obligation = events[0]!.obligation;
    return (
      obligation.label?.trim() ||
      obligation.serviceTitle?.trim() ||
      "Account payment"
    );
  }
  const labels = [
    ...new Set(
      events.map(
        (item) =>
          item.obligation.label?.trim() ||
          item.obligation.serviceTitle?.trim() ||
          "",
      ),
    ),
  ].filter(Boolean);
  if (labels.length === 1) return labels[0]!;
  if (labels.length > 1 && labels.length <= 3) return labels.join("; ");

  const kinds = new Set(events.map((item) => item.obligation.kind));
  const allProject = [...kinds].every((kind) =>
    isProjectKind(kind as InvoiceObligation["kind"]),
  );
  if (allProject) return "Website Design & Development";
  return "Account payment";
}

type EventLeg = {
  obligation: InvoiceObligation;
  event: ObligationPaymentEvent;
};

/**
 * Build client-safe payment history from obligation paymentEvents.
 * Receipts can reuse this grouping without inventing a second payment model.
 */
export function normalizeObligationPaymentHistory(
  obligations: InvoiceObligation[],
): NormalizedStatementPayment[] {
  const legs: EventLeg[] = [];
  for (const obligation of obligations) {
    for (const event of obligation.paymentEvents ?? []) {
      const amount = Number(event.amountCents);
      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) continue;
      legs.push({ obligation, event });
    }
  }

  // Legacy: fully paid via receipt/status with no events — one synthetic row.
  for (const obligation of obligations) {
    if ((obligation.paymentEvents?.length ?? 0) > 0) continue;
    const receipt = obligation.paymentReceipt;
    if (!receipt || receipt.status !== "paid") continue;
    const amount = Number(receipt.amountCents);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    legs.push({
      obligation,
      event: {
        id: `legacy-receipt:${obligation.id}`,
        paymentGroupId: `legacy-receipt:${obligation.id}`,
        amountCents: amount,
        currency: receipt.currency || obligation.currency || "USD",
        paidAt: receipt.paidAt,
        externalPaymentMethod: receipt.externalPaymentMethod,
        externalReference: receipt.externalReference ?? receipt.stripeInvoiceId ?? null,
        recordedBy: receipt.recordedBy,
        recordedAt: receipt.recordedAt,
        stripeInvoiceId: receipt.stripeInvoiceId ?? null,
        collectionChannel: receipt.collectionChannel,
        idempotencyKey: receipt.idempotencyKey,
      },
    });
  }

  const groups = new Map<string, EventLeg[]>();
  for (const leg of legs) {
    const key =
      leg.event.paymentGroupId?.trim() ||
      `solo:${leg.obligation.id}:${leg.event.id}`;
    const list = groups.get(key) ?? [];
    list.push(leg);
    groups.set(key, list);
  }

  const payments: NormalizedStatementPayment[] = [];
  for (const [groupId, groupLegs] of groups) {
    const amountCents = groupLegs.reduce(
      (sum, leg) => sum + (Number(leg.event.amountCents) || 0),
      0,
    );
    const dates = groupLegs
      .map((leg) => toCalendarDate(leg.event.paidAt))
      .filter(Boolean)
      .sort();
    const paidOn = dates[0] ?? "1970-01-01";
    const method =
      methodLabel(groupLegs[0]?.event.externalPaymentMethod) ?? null;
    const reference =
      groupLegs
        .map((leg) => leg.event.externalReference || leg.event.stripeInvoiceId)
        .find((value) => Boolean(value && String(value).trim())) ?? null;

    payments.push({
      id: groupId.startsWith("solo:") ? groupLegs[0]!.event.id : groupId,
      paidOn,
      amountCents,
      label: defaultLabelForEvents(groupLegs),
      method,
      reference: reference ? String(reference) : null,
      obligationIds: [...new Set(groupLegs.map((leg) => leg.obligation.id))],
    });
  }

  payments.sort((a, b) => {
    if (a.paidOn !== b.paidOn) return a.paidOn.localeCompare(b.paidOn);
    return a.id.localeCompare(b.id);
  });

  return payments;
}
