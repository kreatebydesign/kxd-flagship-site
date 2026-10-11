/**
 * Audited account credits — non-cash balance reductions on the obligation ledger.
 *
 * Distinct from external payments: never pretends cash was received.
 * Allocates across selected obligations (or FIFO) like payment allocation.
 * Pure package mutation helpers — persistence lives in record wrappers.
 */

import { appendAudit } from "./package.ts";
import { newLifecycleId } from "./hash.ts";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
} from "./types.ts";
import { assertObligationTransition } from "./transitions.ts";
import {
  isObligationOpenForExternalPayment,
  obligationAmountCreditedCents,
  obligationAmountPaidCents,
  obligationRemainingCents,
  planFifoAllocation,
} from "./obligation-balances.ts";

export const ACCOUNT_CREDIT_SOURCE_TYPES = [
  "project-overage",
  "referral-credit",
] as const;

export type AccountCreditSourceType = (typeof ACCOUNT_CREDIT_SOURCE_TYPES)[number];

export type ObligationCreditEvent = {
  id: string;
  /** Shared across legs when one credit is allocated to multiple obligations. */
  creditGroupId: string;
  amountCents: number;
  currency: string;
  /** Calendar/ISO effective date for the credit. */
  creditedAt: string;
  sourceType: AccountCreditSourceType;
  /** Client-facing / operator label, e.g. "Project payment overage". */
  label: string;
  /** Short reason / source text. */
  reason: string;
  note?: string | null;
  /**
   * When this credit is the overage leg of a real external payment,
   * links to that payment group so history can show one cash transaction.
   */
  sourcePaymentGroupId?: string | null;
  recordedBy: string;
  recordedAt: string;
  idempotencyKey: string;
};

export type AccountCreditAllocationLegInput = {
  obligationId: string;
  amountCents: number;
};

export type RecordAccountCreditInput = {
  contractId: number;
  amountCents: number;
  currency?: string;
  creditedAt: string;
  sourceType: AccountCreditSourceType;
  label: string;
  reason: string;
  note?: string | null;
  recordedBy: string;
  allocationMode?: "fifo" | "explicit";
  allocations?: AccountCreditAllocationLegInput[];
  allowedObligationIds?: string[];
  /** Optional link to a cash payment group (project-overage from same Cash App). */
  sourcePaymentGroupId?: string | null;
  clientIdempotencyKey?: string | null;
};

export type AccountCreditAllocationPreview = {
  totalAmountCents: number;
  unallocatedCents: number;
  legs: Array<{
    obligationId: string;
    label: string;
    amountCents: number;
    remainingBeforeCents: number;
    remainingAfterCents: number;
  }>;
};

type FieldErrors = Record<string, string>;

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeCurrency(value: unknown): string {
  return String(value || "USD")
    .trim()
    .toUpperCase();
}

function toCalendarDate(isoOrDate: string): string {
  const raw = String(isoOrDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return raw.slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

function allocationFingerprint(
  legs: Array<{ obligationId: string; amountCents: number }>,
): string {
  return legs
    .map((leg) => `${leg.obligationId}:${leg.amountCents}`)
    .sort()
    .join("|");
}

export function buildAccountCreditIdempotencyKey(input: {
  contractId: number;
  amountCents: number;
  currency: string;
  creditedAt: string;
  sourceType: AccountCreditSourceType;
  label: string;
  clientIdempotencyKey?: string | null;
  allocationFingerprint: string;
}): string {
  if (input.clientIdempotencyKey?.trim()) {
    return `acct-credit|client:${input.clientIdempotencyKey.trim()}`;
  }
  return [
    "acct-credit",
    `contract:${input.contractId}`,
    `amt:${input.amountCents}`,
    `cur:${input.currency}`,
    `at:${toCalendarDate(input.creditedAt)}`,
    `src:${input.sourceType}`,
    `label:${input.label.trim().toLowerCase()}`,
    `alloc:${input.allocationFingerprint}`,
  ].join("|");
}

function findExistingCreditIdempotency(
  plan: ProposedBillingPlan,
  key: string,
): boolean {
  for (const obligation of plan.obligations) {
    if (obligation.creditEvents?.some((event) => event.idempotencyKey === key)) {
      return true;
    }
  }
  return false;
}

export function sourceTypeLabel(sourceType: AccountCreditSourceType): string {
  if (sourceType === "project-overage") return "Project payment overage";
  if (sourceType === "referral-credit") return "Referral credit";
  return sourceType;
}

/**
 * Preview credit allocation across open obligations.
 * Credits use the same openness rules as external payments (remaining > 0).
 */
export function previewAccountCreditAllocation(
  plan: ProposedBillingPlan,
  input: {
    amountCents: number;
    allocationMode?: "fifo" | "explicit";
    allocations?: AccountCreditAllocationLegInput[];
    allowedObligationIds?: string[];
  },
): AccountCreditAllocationPreview | { ok: false; errors: FieldErrors } {
  const amountCents = Number(input.amountCents);
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    return {
      ok: false,
      errors: { amountCents: "Credit amount must be a positive integer in cents." },
    };
  }

  const mode = input.allocationMode ?? (input.allocations?.length ? "explicit" : "fifo");
  let legs: AccountCreditAllocationLegInput[] = [];

  if (mode === "explicit") {
    legs = (input.allocations ?? []).map((leg) => ({
      obligationId: String(leg.obligationId),
      amountCents: Number(leg.amountCents),
    }));
    if (!legs.length) {
      return {
        ok: false,
        errors: { allocations: "Explicit credit allocation requires at least one leg." },
      };
    }
  } else {
    const allowedIds = (input.allowedObligationIds ?? []).map(String).filter(Boolean);
    legs = planFifoAllocation(plan.obligations, amountCents, {
      allowedObligationIds: allowedIds.length ? allowedIds : undefined,
    }).map((leg) => ({
      obligationId: leg.obligationId,
      amountCents: leg.amountCents,
    }));
    if (allowedIds.length) {
      const allowed = new Set(allowedIds);
      for (const leg of legs) {
        if (!allowed.has(leg.obligationId)) {
          return {
            ok: false,
            errors: {
              allocations: "Allocation includes an obligation outside the selected set.",
            },
          };
        }
      }
    }
  }

  if (!legs.length) {
    return {
      ok: false,
      errors: { allocations: "No eligible obligations available for this credit amount." },
    };
  }

  const previewLegs: AccountCreditAllocationPreview["legs"] = [];
  let allocated = 0;

  for (const leg of legs) {
    if (!Number.isInteger(leg.amountCents) || leg.amountCents <= 0) {
      return {
        ok: false,
        errors: { allocations: "Each allocation amount must be a positive integer in cents." },
      };
    }
    const obligation = plan.obligations.find((item) => item.id === leg.obligationId);
    if (!obligation) {
      return { ok: false, errors: { allocations: `Unknown obligation ${leg.obligationId}.` } };
    }
    if (!isObligationOpenForExternalPayment(obligation)) {
      return {
        ok: false,
        errors: {
          allocations: `Obligation “${obligation.label}” is not open for account credit.`,
        },
      };
    }
    const remainingBefore = obligationRemainingCents(obligation);
    if (leg.amountCents > remainingBefore) {
      return {
        ok: false,
        errors: {
          allocations: `Credit to “${obligation.label}” exceeds remaining $${(remainingBefore / 100).toFixed(2)}.`,
        },
      };
    }
    allocated += leg.amountCents;
    previewLegs.push({
      obligationId: obligation.id,
      label: obligation.label,
      amountCents: leg.amountCents,
      remainingBeforeCents: remainingBefore,
      remainingAfterCents: remainingBefore - leg.amountCents,
    });
  }

  if (allocated > amountCents) {
    return {
      ok: false,
      errors: { allocations: "Credit allocations exceed the credit amount." },
    };
  }

  return {
    totalAmountCents: amountCents,
    unallocatedCents: amountCents - allocated,
    legs: previewLegs,
  };
}

function deriveSettledStatus(obligation: InvoiceObligation): InvoiceObligation["status"] {
  const remaining = obligationRemainingCents(obligation);
  const cashPaid = obligationAmountPaidCents(obligation);
  const credited = obligationAmountCreditedCents(obligation);
  if (remaining <= 0) return "paid";
  if (cashPaid > 0 || credited > 0) return "partially-paid";
  return obligation.status;
}

function applyCreditEventToObligation(
  obligation: InvoiceObligation,
  event: ObligationCreditEvent,
): InvoiceObligation {
  const events = [...(obligation.creditEvents ?? []), event];
  const nextBase: InvoiceObligation = {
    ...obligation,
    creditEvents: events,
  };
  const status = deriveSettledStatus(nextBase);
  if (obligation.status !== status) {
    assertObligationTransition(obligation.status, status);
  }
  return {
    ...nextBase,
    status,
    paidAt: status === "paid" ? obligation.paidAt ?? event.creditedAt : obligation.paidAt,
  };
}

/**
 * Apply an audited account credit allocation to a lifecycle package.
 * Does not create payment events or change cash-received totals.
 */
export function applyAccountCredit(
  pkg: ContractLifecyclePackage,
  input: RecordAccountCreditInput,
):
  | {
      ok: true;
      pkg: ContractLifecyclePackage;
      idempotentReplay: boolean;
      preview: AccountCreditAllocationPreview;
      creditGroupId: string;
    }
  | { ok: false; errors: FieldErrors } {
  const plan = pkg.billingPlan;
  if (!plan) {
    return {
      ok: false,
      errors: { plan: "Billing plan with obligations is required before recording an account credit." },
    };
  }

  const errors: FieldErrors = {};
  const amountCents = Number(input.amountCents);
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    errors.amountCents = "Credit amount must be a positive integer in cents.";
  }

  const currency = normalizeCurrency(input.currency ?? plan.currency);
  if (currency !== "USD") errors.currency = "Only USD is supported for account credits.";

  const creditedAt = trimOrNull(input.creditedAt);
  if (!creditedAt) errors.creditedAt = "Credit effective date is required.";
  else if (Number.isNaN(Date.parse(creditedAt))) {
    errors.creditedAt = "Credit effective date must be a valid date.";
  }

  if (!ACCOUNT_CREDIT_SOURCE_TYPES.includes(input.sourceType)) {
    errors.sourceType = "Unsupported account credit source type.";
  }

  const label = trimOrNull(input.label);
  if (!label) errors.label = "Credit label is required.";

  const reason = trimOrNull(input.reason);
  if (!reason) errors.reason = "Credit reason / source is required.";

  const recordedBy = trimOrNull(input.recordedBy);
  if (!recordedBy) errors.recordedBy = "Operator who recorded the credit is required.";

  if (Object.keys(errors).length) return { ok: false, errors };

  const mode = input.allocationMode ?? (input.allocations?.length ? "explicit" : "fifo");

  if (mode === "explicit" && (input.allocations?.length ?? 0) > 0) {
    const explicitLegs = (input.allocations ?? []).map((leg) => ({
      obligationId: String(leg.obligationId),
      amountCents: Number(leg.amountCents),
    }));
    const earlyFingerprint = allocationFingerprint(explicitLegs);
    const earlyKey = buildAccountCreditIdempotencyKey({
      contractId: input.contractId,
      amountCents,
      currency,
      creditedAt: creditedAt!,
      sourceType: input.sourceType,
      label: label!,
      clientIdempotencyKey: input.clientIdempotencyKey,
      allocationFingerprint: earlyFingerprint,
    });
    if (findExistingCreditIdempotency(plan, earlyKey)) {
      const preview = previewAccountCreditAllocation(plan, {
        amountCents,
        allocationMode: "explicit",
        allocations: explicitLegs,
        allowedObligationIds: input.allowedObligationIds,
      });
      const safePreview: AccountCreditAllocationPreview =
        "ok" in preview && preview.ok === false
          ? {
              totalAmountCents: amountCents,
              unallocatedCents: 0,
              legs: explicitLegs.map((leg) => {
                const obligation = plan.obligations.find((item) => item.id === leg.obligationId);
                return {
                  obligationId: leg.obligationId,
                  label: obligation?.label ?? leg.obligationId,
                  amountCents: leg.amountCents,
                  remainingBeforeCents: 0,
                  remainingAfterCents: 0,
                };
              }),
            }
          : (preview as AccountCreditAllocationPreview);
      return {
        ok: true,
        pkg,
        idempotentReplay: true,
        preview: safePreview,
        creditGroupId:
          plan.obligations
            .flatMap((o) => o.creditEvents ?? [])
            .find((e) => e.idempotencyKey === earlyKey)?.creditGroupId ?? "replay",
      };
    }
  }

  const preview = previewAccountCreditAllocation(plan, {
    amountCents,
    allocationMode: input.allocationMode,
    allocations: input.allocations,
    allowedObligationIds: input.allowedObligationIds,
  });
  if ("ok" in preview && preview.ok === false) return preview;
  const allocationPreview = preview as AccountCreditAllocationPreview;

  if (allocationPreview.unallocatedCents > 0) {
    return {
      ok: false,
      errors: {
        amountCents: `Credit leaves $${(allocationPreview.unallocatedCents / 100).toFixed(2)} unallocated. Reduce the amount or select more open obligations.`,
      },
    };
  }

  const fingerprint = allocationFingerprint(
    allocationPreview.legs.map((leg) => ({
      obligationId: leg.obligationId,
      amountCents: leg.amountCents,
    })),
  );
  const idempotencyKey = buildAccountCreditIdempotencyKey({
    contractId: input.contractId,
    amountCents,
    currency,
    creditedAt: creditedAt!,
    sourceType: input.sourceType,
    label: label!,
    clientIdempotencyKey: input.clientIdempotencyKey,
    allocationFingerprint: fingerprint,
  });

  if (findExistingCreditIdempotency(plan, idempotencyKey)) {
    return {
      ok: true,
      pkg,
      idempotentReplay: true,
      preview: allocationPreview,
      creditGroupId:
        plan.obligations
          .flatMap((o) => o.creditEvents ?? [])
          .find((e) => e.idempotencyKey === idempotencyKey)?.creditGroupId ?? "replay",
    };
  }

  const recordedAt = new Date().toISOString();
  const creditGroupId = newLifecycleId("credgrp");
  const sourcePaymentGroupId = trimOrNull(input.sourcePaymentGroupId);

  let nextObligations = plan.obligations;
  for (const leg of allocationPreview.legs) {
    const event: ObligationCreditEvent = {
      id: newLifecycleId("credevt"),
      creditGroupId,
      amountCents: leg.amountCents,
      currency,
      creditedAt: creditedAt!,
      sourceType: input.sourceType,
      label: label!,
      reason: reason!,
      note: trimOrNull(input.note),
      sourcePaymentGroupId,
      recordedBy: recordedBy!,
      recordedAt,
      idempotencyKey,
    };
    nextObligations = nextObligations.map((obligation) =>
      obligation.id === leg.obligationId
        ? applyCreditEventToObligation(obligation, event)
        : obligation,
    );
  }

  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: {
      ...plan,
      obligations: nextObligations,
      updatedAt: recordedAt,
    },
  };

  next = appendAudit(next, {
    actor: recordedBy!,
    action: "obligation.account-credit-allocated",
    reason: `${input.sourceType} · ${label} · $${(amountCents / 100).toFixed(2)} across ${allocationPreview.legs.length} obligation(s)`,
    correlationId: creditGroupId,
  });

  return {
    ok: true,
    pkg: next,
    idempotentReplay: false,
    preview: allocationPreview,
    creditGroupId,
  };
}

/** Sum credited cents for a payment group’s linked overage credits. */
export function sumOverageCreditsForPaymentGroup(
  obligations: InvoiceObligation[],
  paymentGroupId: string,
): number {
  let sum = 0;
  for (const obligation of obligations) {
    for (const event of obligation.creditEvents ?? []) {
      if (event.sourcePaymentGroupId !== paymentGroupId) continue;
      if (event.sourceType !== "project-overage") continue;
      const amount = Number(event.amountCents);
      if (Number.isInteger(amount) && amount > 0) sum += amount;
    }
  }
  return sum;
}

/** Normalize credit history groups for statements / account history. */
export function normalizeAccountCreditHistory(
  obligations: InvoiceObligation[],
): Array<{
  id: string;
  creditedOn: string;
  amountCents: number;
  label: string;
  sourceType: AccountCreditSourceType;
  reason: string;
  note: string | null;
  sourcePaymentGroupId: string | null;
  obligationIds: string[];
}> {
  type Leg = { obligation: InvoiceObligation; event: ObligationCreditEvent };
  const legs: Leg[] = [];
  for (const obligation of obligations) {
    for (const event of obligation.creditEvents ?? []) {
      const amount = Number(event.amountCents);
      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) continue;
      legs.push({ obligation, event });
    }
  }

  const groups = new Map<string, Leg[]>();
  for (const leg of legs) {
    const key = leg.event.creditGroupId?.trim() || `solo:${leg.obligation.id}:${leg.event.id}`;
    const list = groups.get(key) ?? [];
    list.push(leg);
    groups.set(key, list);
  }

  const credits = [...groups.entries()].map(([groupId, groupLegs]) => {
    const first = groupLegs[0]!.event;
    const amountCents = groupLegs.reduce(
      (sum, leg) => sum + (Number(leg.event.amountCents) || 0),
      0,
    );
    const dates = groupLegs
      .map((leg) => toCalendarDate(leg.event.creditedAt))
      .filter(Boolean)
      .sort();
    return {
      id: groupId.startsWith("solo:") ? first.id : groupId,
      creditedOn: dates[0] ?? "1970-01-01",
      amountCents,
      label: first.label,
      sourceType: first.sourceType,
      reason: first.reason,
      note: first.note ?? null,
      sourcePaymentGroupId: first.sourcePaymentGroupId ?? null,
      obligationIds: [...new Set(groupLegs.map((leg) => leg.obligation.id))],
    };
  });

  credits.sort((a, b) => {
    if (a.creditedOn !== b.creditedOn) return a.creditedOn.localeCompare(b.creditedOn);
    return a.id.localeCompare(b.id);
  });
  return credits;
}
