/**
 * Overlay structuredPaymentTerms recurring fields from a Growth commercial amendment.
 * Does not rebuild installments or touch acceptedSnapshot / billingPlan obligations.
 */

import type { RecurringServiceAmendment } from "./commercial-amendments.ts";
import {
  PLATINUM_GROWTH_AMOUNT_CENTS,
  PLATINUM_GROWTH_EFFECTIVE_DATE,
  PLATINUM_GROWTH_TITLE,
} from "./commercial-amendments.ts";
import type { StructuredPaymentTerms } from "./types.ts";

export function overlayStructuredTermsWithRecurringService(
  terms: StructuredPaymentTerms,
  recurringService: RecurringServiceAmendment,
): StructuredPaymentTerms {
  const amountCents = Number(recurringService.amountCents);
  return {
    ...terms,
    monthlyTotalCents: amountCents,
    recurring: {
      ...terms.recurring,
      amountCents,
      cadence: amountCents > 0 ? "monthly" : "none",
      startTrigger:
        recurringService.startBillingDateStatus === "confirmed" &&
        recurringService.startBillingDate
          ? "confirmed-start-date"
          : recurringService.startTrigger,
      minimumTermMonths: null,
      renewalBehavior: "Month-to-month unless otherwise agreed in writing.",
      status: amountCents > 0 ? "pending-trigger" : "cancelled",
      startBillingDate: recurringService.startBillingDate ?? null,
      startBillingDateStatus: recurringService.startBillingDateStatus,
      serviceTitle: recurringService.title,
      includes: [...(recurringService.includes ?? [])],
      excludes: [...(recurringService.excludes ?? [])],
      rankingDisclaimer: recurringService.rankingDisclaimer ?? null,
      commencementNotes: recurringService.commencementNotes ?? null,
    },
  };
}

export function isPlatinumGrowthStructuredTermsPresent(
  terms: StructuredPaymentTerms | null | undefined,
): boolean {
  const recurring = terms?.recurring;
  if (!recurring) return false;
  return (
    recurring.serviceTitle === PLATINUM_GROWTH_TITLE &&
    Number(recurring.amountCents) === Number(PLATINUM_GROWTH_AMOUNT_CENTS) &&
    recurring.startBillingDate === PLATINUM_GROWTH_EFFECTIVE_DATE &&
    recurring.startBillingDateStatus === "confirmed" &&
    Number(terms?.monthlyTotalCents) === Number(PLATINUM_GROWTH_AMOUNT_CENTS)
  );
}
