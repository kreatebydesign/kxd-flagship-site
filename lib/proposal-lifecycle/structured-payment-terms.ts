/**
 * Derive structured, reviewable payment terms from an accepted canonical proposal.
 * Source of truth for billing prep — never invent missing legal/tax facts.
 */

import type { CanonicalProposal } from "../proposal-builder/types.ts";
import { newLifecycleId } from "./hash.ts";
import type { StructuredPaymentTerms } from "./types.ts";

export function deriveStructuredPaymentTerms(
  canonical: CanonicalProposal,
  acceptanceHash?: string,
): StructuredPaymentTerms {
  const installments = canonical.paymentSchedule.map((item) => ({
    id: item.id || newLifecycleId("obl"),
    label: item.label,
    amountCents: item.amountCents,
    trigger: item.due,
    dueTerms: describeDue(item.due),
    status: "pending-trigger" as const,
  }));

  const deposit = canonical.totals.depositCents;
  const initial = installments[0];

  return {
    schemaVersion: 1,
    currency: canonical.currency || "USD",
    oneTimeTotalCents: canonical.totals.oneTimeTotalCents,
    monthlyTotalCents: canonical.totals.monthlyTotalCents,
    depositCents: deposit,
    initialPayment: {
      type: deposit > 0 ? "deposit" : canonical.totals.oneTimeTotalCents > 0 ? "full" : "none",
      amountCents: initial?.amountCents ?? deposit,
      trigger:
        (initial?.trigger as "at-acceptance" | "at-contract" | "on-date" | "manual") ||
        "at-acceptance",
      dueTerms: initial?.dueTerms ?? "Due upon proposal acceptance / contract execution",
    },
    installments,
    recurring: {
      amountCents: canonical.totals.monthlyTotalCents,
      cadence: canonical.totals.monthlyTotalCents > 0 ? "monthly" : "none",
      startTrigger:
        canonical.totals.monthlyTotalCents > 0
          ? "after-launch-verified"
          : "not-applicable",
      minimumTermMonths: canonical.totals.monthlyTotalCents > 0 ? 12 : null,
      renewalBehavior:
        canonical.totals.monthlyTotalCents > 0
          ? "[REVIEW REQUIRED] Define renewal/cancellation in final agreement"
          : "none",
      status: canonical.totals.monthlyTotalCents > 0 ? "pending-trigger" : "cancelled",
    },
    credits: canonical.credits.map((c) => ({
      label: c.label,
      amountCents: c.amountCents,
      appliesTo: c.appliesTo,
    })),
    taxes: {
      treatment: "unspecified",
      notes: "[BLOCKER until reviewed] Tax treatment must be confirmed before invoice send.",
    },
    billingContactName: canonical.primaryContact?.name ?? "",
    billingEmail: canonical.primaryContact?.email ?? "",
    payerLegalName: canonical.primaryOrganization,
    brandName: canonical.organizations.map((o) => o.name).join(" · ") || undefined,
    commercialSource: "proposal",
    sourceProposalNumber: canonical.proposalNumber,
    sourceProposalVersion: canonical.version,
    sourceAcceptanceHash: acceptanceHash,
    derivedAt: new Date().toISOString(),
  };
}

function describeDue(due: string): string {
  switch (due) {
    case "at-acceptance":
      return "Due upon proposal acceptance";
    case "at-contract":
      return "Due at contract signing";
    case "milestone":
      return "Due at project milestone";
    case "remaining":
      return "Final payment";
    case "on-date":
      return "Due on scheduled date";
    default:
      return "Payment timing requires review";
  }
}

export function reconcileInstallments(
  terms: StructuredPaymentTerms,
): { sumCents: number; differenceCents: number; ok: boolean } {
  const sum = terms.installments.reduce((acc, i) => acc + i.amountCents, 0);
  const target = terms.oneTimeTotalCents;
  const differenceCents = sum - target;
  return { sumCents: sum, differenceCents, ok: differenceCents === 0 };
}
