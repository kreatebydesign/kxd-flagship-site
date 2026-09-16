/**
 * Client-facing payment history labels from obligation allocation legs.
 *
 * Groups multi-leg payments into one row. Never invents payment evidence.
 * Never exposes operator notes, idempotency keys, or Stripe object IDs.
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

const STAGE_SUFFIX_RE =
  /\s+[—–-]\s+(Deposit|Progress Payment|Final Payment|Initial Payment|Milestone(?:\s+\d+)?|Final)\s*$/i;
const BARE_STAGE_RE =
  /^(Deposit|Progress Payment|Final Payment|Initial Payment|Initial|Milestone(?:\s+\d+)?|Final)$/i;

/** Stripe / provider object ids are reconciliation evidence — not client copy. */
const PROVIDER_OBJECT_ID_RE =
  /^(in|pi|ch|cs|txn|py|seti|pm|cus|acct|price|prod)_[A-Za-z0-9]+$/;

export function isClientFacingPaymentReference(
  value: string | null | undefined,
): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  if (PROVIDER_OBJECT_ID_RE.test(raw)) return false;
  return true;
}

export function clientFacingPaymentReference(
  value: string | null | undefined,
): string | null {
  const raw = String(value ?? "").trim();
  if (!isClientFacingPaymentReference(raw)) return null;
  return raw;
}

/**
 * Parent service/project name for a staged obligation label.
 * "Website Design & Development — Final Payment" → "Website Design & Development"
 */
export function projectServiceFamily(obligation: InvoiceObligation): string {
  const label = obligation.label?.trim() || "";
  const staged = label.match(/^(.*?)\s+[—–-]\s+/);
  if (staged?.[1]?.trim()) return staged[1].trim();
  if (BARE_STAGE_RE.test(label) && isProjectKind(obligation.kind)) {
    return "Website Design & Development";
  }
  return (
    obligation.serviceTitle?.trim() ||
    label ||
    "Account payment"
  );
}

function isStagedProjectLabel(label: string): boolean {
  const trimmed = label.trim();
  return STAGE_SUFFIX_RE.test(trimmed) || BARE_STAGE_RE.test(trimmed);
}

/**
 * Client-facing payment description.
 *
 * Rules:
 * - Single full-stage allocation may keep the obligation label.
 * - Partial allocation to a staged label (e.g. Final Payment) uses a neutral
 *   "Project Payment" description — never implies the stage was completed.
 * - Multi-obligation allocations never concatenate obligation titles.
 */
export function clientFacingPaymentLabel(
  events: Array<{ obligation: InvoiceObligation; event: ObligationPaymentEvent }>,
): string {
  if (events.length === 1) {
    const { obligation, event } = events[0]!;
    const label = obligation.label?.trim() || "";
    if (
      isStagedProjectLabel(label) &&
      event.amountCents < obligation.amountCents
    ) {
      return `${projectServiceFamily(obligation)} — Project Payment`;
    }
    return (
      label ||
      obligation.serviceTitle?.trim() ||
      "Account payment"
    );
  }

  const families = [
    ...new Set(events.map((item) => projectServiceFamily(item.obligation))),
  ].filter(Boolean);
  const allProject = events.every((item) => isProjectKind(item.obligation.kind));

  if (families.length === 1) {
    return `${families[0]} — Project Payment`;
  }
  if (allProject) {
    return "Website Design & Development — Project Payment";
  }
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
        .map((leg) =>
          clientFacingPaymentReference(
            leg.event.externalReference || leg.event.stripeInvoiceId,
          ),
        )
        .find((value) => Boolean(value)) ?? null;

    payments.push({
      id: groupId.startsWith("solo:") ? groupLegs[0]!.event.id : groupId,
      paidOn,
      amountCents,
      label: clientFacingPaymentLabel(groupLegs),
      method,
      reference,
      obligationIds: [...new Set(groupLegs.map((leg) => leg.obligation.id))],
    });
  }

  payments.sort((a, b) => {
    if (a.paidOn !== b.paidOn) return a.paidOn.localeCompare(b.paidOn);
    return a.id.localeCompare(b.id);
  });

  return payments;
}
