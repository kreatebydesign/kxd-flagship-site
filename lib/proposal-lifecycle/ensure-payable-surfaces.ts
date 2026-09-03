/**
 * Project ancillary charges and operator-registered recurring due occurrences
 * onto a billing plan as payable obligations — without duplicating rows.
 */

import type {
  InvoiceObligation,
  ProposedBillingPlan,
  StructuredPaymentTerms,
} from "./types.ts";
import { newLifecycleId } from "./hash.ts";

function hasObligationSource(
  plan: ProposedBillingPlan,
  sourceKey: string,
): boolean {
  return plan.obligations.some(
    (obligation) =>
      obligation.sourceKey === sourceKey ||
      obligation.id === sourceKey ||
      obligation.id.endsWith(`-${sourceKey}`),
  );
}

export function ensureAncillaryObligationsOnPlan(
  plan: ProposedBillingPlan,
  terms: StructuredPaymentTerms | null | undefined,
): ProposedBillingPlan {
  const charges = terms?.ancillaryCharges ?? [];
  if (!charges.length) return plan;

  const additions: InvoiceObligation[] = [];
  for (const charge of charges) {
    const sourceKey = `ancillary:${charge.id}`;
    if (hasObligationSource(plan, sourceKey) || hasObligationSource(plan, charge.id)) {
      continue;
    }
    additions.push({
      id: charge.id || newLifecycleId("obl"),
      kind: "addon",
      label: charge.title,
      amountCents: charge.amountCents,
      currency: terms?.currency ?? plan.currency,
      trigger: charge.dueTrigger,
      dueTerms:
        charge.cadence === "annual"
          ? "Annual charge — due per agreement terms"
          : "One-time ancillary charge",
      dueDate: charge.dueDate ?? null,
      status: charge.status === "paid" ? "paid" : "pending-trigger",
      stripeDraftInvoiceId: null,
      amountPaidCents: charge.status === "paid" ? charge.amountCents : 0,
      paymentEvents: [],
      collectionChannel: null,
      paymentReceipt: null,
      sourceKey,
    });
  }

  if (!additions.length) return plan;
  return {
    ...plan,
    obligations: [...plan.obligations, ...additions],
    updatedAt: new Date().toISOString(),
  };
}

export type RecurringDueOccurrenceInput = {
  /** Stable key for dedupe, e.g. recurring:care-social:2026-09 */
  sourceKey: string;
  label: string;
  amountCents: number;
  currency?: string;
  dueDate: string;
  serviceTitle?: string;
  recordedBy?: string | null;
};

/** Build a stable period source key. serviceKey should be slug-like. */
export function buildRecurringOccurrenceSourceKey(
  serviceKey: string,
  periodYearMonth: string,
): string {
  const slug =
    String(serviceKey || "service")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "service";
  const period = String(periodYearMonth || "").trim().slice(0, 7);
  return `recurring:${slug}:${period}`;
}

/**
 * Resolve due date for a monthly service billed on billDay of periodYearMonth.
 * periodYearMonth: YYYY-MM. billDay: 1–28 preferred (clamped to month length).
 */
export function resolveMonthlyDueDate(periodYearMonth: string, billDay: number): string {
  const [yRaw, mRaw] = String(periodYearMonth).split("-");
  const year = Number(yRaw);
  const month = Number(mRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Period must be YYYY-MM.");
  }
  const day = Math.min(Math.max(1, Math.floor(billDay) || 1), 28);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function previewRecurringDueOccurrence(
  plan: ProposedBillingPlan,
  input: RecurringDueOccurrenceInput,
): {
  wouldCreate: boolean;
  sourceKey: string;
  label: string;
  amountCents: number;
  dueDate: string;
  existingObligationId: string | null;
} {
  const existing = plan.obligations.find(
    (obligation) =>
      obligation.sourceKey === input.sourceKey || obligation.id === input.sourceKey,
  );
  return {
    wouldCreate: !existing,
    sourceKey: input.sourceKey,
    label: input.label,
    amountCents: input.amountCents,
    dueDate: input.dueDate,
    existingObligationId: existing?.id ?? null,
  };
}

/**
 * Ensure a currently-due recurring period appears as a payable obligation.
 * Does not create Stripe subscriptions. Does not mutate legal amendments.
 */
export function ensureRecurringDueOccurrenceOnPlan(
  plan: ProposedBillingPlan,
  input: RecurringDueOccurrenceInput,
): ProposedBillingPlan {
  if (hasObligationSource(plan, input.sourceKey)) return plan;
  const obligation: InvoiceObligation = {
    id: newLifecycleId("obl"),
    kind: "recurring-period",
    label: input.label,
    amountCents: input.amountCents,
    currency: input.currency ?? plan.currency,
    trigger: "on-date",
    dueTerms: input.serviceTitle
      ? `${input.serviceTitle} — period due ${input.dueDate}`
      : `Recurring service period due ${input.dueDate}`,
    dueDate: input.dueDate,
    status: "pending-trigger",
    stripeDraftInvoiceId: null,
    amountPaidCents: 0,
    paymentEvents: [],
    collectionChannel: null,
    paymentReceipt: null,
    sourceKey: input.sourceKey,
  };
  return {
    ...plan,
    obligations: [...plan.obligations, obligation],
    updatedAt: new Date().toISOString(),
  };
}

export function ensurePayableSurfacesOnPlan(
  plan: ProposedBillingPlan,
  terms: StructuredPaymentTerms | null | undefined,
): ProposedBillingPlan {
  return ensureAncillaryObligationsOnPlan(plan, terms);
}

/** Count how many new ancillary rows would be added (for tests / UI). */
export function countMissingAncillaryObligations(
  plan: ProposedBillingPlan,
  terms: StructuredPaymentTerms | null | undefined,
): number {
  const next = ensureAncillaryObligationsOnPlan(plan, terms);
  return next.obligations.length - plan.obligations.length;
}
