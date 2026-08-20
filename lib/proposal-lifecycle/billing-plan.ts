/**
 * Proposed billing plan from executed structured payment terms.
 * Prepares mock Stripe drafts only — never finalizes, sends, or activates.
 */

import type { StructuredPaymentTerms } from "./types.ts";
import type { ProposedBillingPlan, ReadinessIssue } from "./types.ts";
import { newLifecycleId } from "./hash.ts";
import { reconcileInstallments } from "./structured-payment-terms.ts";
import { blockersForStripePrep } from "./billing-readiness.ts";

export function buildProposedBillingPlan(input: {
  contractId: number;
  proposalId: number;
  proposalNumber: string;
  contractVersion: number;
  contractHash: string;
  terms: StructuredPaymentTerms;
  issues: ReadinessIssue[];
}): ProposedBillingPlan {
  const recon = reconcileInstallments(input.terms);
  const stripeBlockers = blockersForStripePrep(input.issues);
  const status =
    stripeBlockers.length > 0
      ? "blocked"
      : recon.ok
        ? "ready-for-review"
        : "blocked";

  const obligations = input.terms.installments.map((item, index) => ({
    id: item.id || newLifecycleId("obl"),
    kind: (index === 0
      ? "initial"
      : index === input.terms.installments.length - 1
        ? "final"
        : "milestone") as "initial" | "milestone" | "final",
    label: professionalLineLabel(item.label, index, input.terms.installments.length),
    amountCents: item.amountCents,
    currency: input.terms.currency,
    trigger: item.trigger,
    dueTerms: item.dueTerms,
    dueDate: item.dueDate ?? null,
    status: "pending-trigger" as const,
    stripeDraftInvoiceId: null,
    collectionChannel: null,
    paymentReceipt: null,
  }));

  const recurring =
    input.terms.recurring.amountCents > 0 && input.terms.recurring.cadence !== "none"
      ? {
          id: newLifecycleId("sched"),
          amountCents: input.terms.recurring.amountCents,
          currency: input.terms.currency,
          cadence: input.terms.recurring.cadence as "monthly" | "quarterly" | "annual",
          startTrigger: input.terms.recurring.startTrigger,
          minimumTermMonths: input.terms.recurring.minimumTermMonths,
          status: "pending-trigger" as const,
          stripeScheduleOrSubscriptionId: null,
        }
      : null;

  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: newLifecycleId("bplan"),
    status,
    invoiceReadiness: status === "blocked" ? "conflict-detected" : "ready-for-review",
    contractId: input.contractId,
    proposalId: input.proposalId,
    proposalNumber: input.proposalNumber,
    contractVersion: input.contractVersion,
    contractHash: input.contractHash,
    currency: input.terms.currency,
    oneTimeTotalCents: input.terms.oneTimeTotalCents,
    monthlyTotalCents: input.terms.monthlyTotalCents,
    obligations,
    recurring,
    issues: input.issues,
    reconciliation: {
      contractOneTimeCents: input.terms.oneTimeTotalCents,
      obligationsSumCents: recon.sumCents,
      differenceCents: recon.differenceCents,
      creditsAppliedOnce: true,
    },
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
    mockStripe: { customerId: null, draftInvoiceIds: [], inactiveScheduleId: null },
  };
}

function professionalLineLabel(raw: string, index: number, total: number): string {
  const lower = raw.toLowerCase();
  if (lower.includes("deposit installment") || lower.includes("deposit")) {
    return raw.trim() || "Website Design & Development — Deposit Installment";
  }
  if (lower.includes("progress") || lower.includes("milestone")) {
    return "Website Design & Development — Progress Payment";
  }
  if (lower.includes("final") || index === total - 1) {
    return "Website Design & Development — Final Payment";
  }
  return raw.trim() || `Professional services — installment ${index + 1}`;
}

export function attachMockStripeDrafts(
  plan: ProposedBillingPlan,
  drafts: { customerId: string; invoiceIds: string[]; scheduleId?: string | null },
): ProposedBillingPlan {
  return {
    ...plan,
    status: plan.status === "blocked" ? "blocked" : "ready-for-review",
    invoiceReadiness:
      plan.status === "blocked" ? plan.invoiceReadiness : "stripe-draft-created",
    updatedAt: new Date().toISOString(),
    mockStripe: {
      customerId: drafts.customerId,
      draftInvoiceIds: drafts.invoiceIds,
      inactiveScheduleId: drafts.scheduleId ?? null,
    },
    obligations: plan.obligations.map((o, i) => ({
      ...o,
      status: o.kind === "initial" ? "draft-ready" : o.status,
      stripeDraftInvoiceId: drafts.invoiceIds[i] ?? o.stripeDraftInvoiceId ?? null,
    })),
    recurring: plan.recurring
      ? {
          ...plan.recurring,
          status: "ready-for-review",
          stripeScheduleOrSubscriptionId: drafts.scheduleId ?? null,
        }
      : null,
  };
}
