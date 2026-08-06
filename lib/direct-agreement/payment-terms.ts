/**
 * Derive StructuredPaymentTerms from a finalized Direct Agreement.
 * Parallel to deriveStructuredPaymentTerms(canonical) — never invents proposal data.
 */

import { newLifecycleId } from "@/lib/proposal-lifecycle/hash";
import type { StructuredPaymentTerms } from "@/lib/proposal-lifecycle/types";
import type { DirectAgreementTerms } from "./types";

export function directAgreementSourceLabel(contractId: number): string {
  return `DIRECT-${contractId}`;
}

export function deriveStructuredPaymentTermsFromDirectAgreement(
  terms: DirectAgreementTerms,
  contractId: number,
): StructuredPaymentTerms {
  const oneTime = Math.max(0, Math.trunc(terms.oneTimeAmountCents));
  const monthly = Math.max(0, Math.trunc(terms.monthlyAmountCents));

  const installments =
    oneTime > 0
      ? [
          {
            id: newLifecycleId("obl"),
            label:
              terms.commercialStructure === "one-time"
                ? "Prepaid agreement fee"
                : "Initial / one-time fee",
            amountCents: oneTime,
            trigger: "at-contract" as const,
            dueTerms: terms.paymentTerms || "Due upon agreement acceptance",
            status: "pending-trigger" as const,
          },
        ]
      : [];

  return {
    schemaVersion: 1,
    currency: terms.currency || "USD",
    oneTimeTotalCents: oneTime,
    monthlyTotalCents: monthly,
    depositCents: oneTime,
    initialPayment: {
      type: oneTime > 0 ? "full" : monthly > 0 ? "none" : "none",
      amountCents: oneTime,
      trigger: "at-contract",
      dueTerms: terms.paymentTerms || "Due upon agreement acceptance",
    },
    installments,
    recurring: {
      amountCents: monthly,
      cadence: monthly > 0 ? "monthly" : "none",
      startTrigger: monthly > 0 ? "after-launch-verified" : "not-applicable",
      minimumTermMonths: null,
      renewalBehavior:
        monthly > 0
          ? terms.renewalBehavior || "[REVIEW REQUIRED] Define renewal/cancellation"
          : terms.autoRenew
            ? "[REVIEW REQUIRED] Auto-renew was set unexpectedly on non-recurring terms"
            : "none",
      status: monthly > 0 ? "pending-trigger" : "cancelled",
    },
    credits: [],
    taxes: {
      treatment: "unspecified",
      notes: "[BLOCKER until reviewed] Tax treatment must be confirmed before invoice send.",
    },
    billingContactName: terms.billingContactName ?? "",
    billingEmail: terms.billingEmail ?? "",
    payerLegalName: terms.payerLegalName ?? undefined,
    brandName: terms.brandName ?? undefined,
    commercialSource: "direct-agreement",
    sourceProposalNumber: directAgreementSourceLabel(contractId),
    sourceProposalVersion: terms.termsVersion,
    sourceAcceptanceHash: undefined,
    derivedAt: new Date().toISOString(),
  };
}

/** True when one-time prepaid Direct Agreement correctly avoids recurring billing. */
export function assertOneTimeHasNoRecurring(terms: StructuredPaymentTerms): {
  ok: boolean;
  reason?: string;
} {
  if (terms.oneTimeTotalCents > 0 && terms.monthlyTotalCents === 0) {
    if (terms.recurring.cadence !== "none" || terms.recurring.amountCents !== 0) {
      return { ok: false, reason: "One-time prepaid terms must not create recurring billing." };
    }
    if (terms.recurring.status !== "cancelled") {
      return { ok: false, reason: "One-time prepaid recurring schedule must be cancelled." };
    }
  }
  return { ok: true };
}
