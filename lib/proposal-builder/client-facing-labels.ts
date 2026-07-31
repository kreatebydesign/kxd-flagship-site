/**
 * Client-facing labels for proposal PDF / preview / public surfaces.
 * Never expose raw enum codes to clients.
 *
 * Money presentation only — does not change stored cents or totals math.
 * Credit amounts are stored as positive magnitudes; display adds a leading
 * ASCII hyphen-minus so PDF Helvetica (and web) render the reduction clearly.
 */

import { formatCents } from "./money.ts";
import type { CreditKind, PaymentScheduleItem, ProposalCredit } from "./types.ts";

/** ASCII hyphen-minus — Unicode − (U+2212) drops in @react-pdf Helvetica. */
const CREDIT_SIGN = "-";

export function formatClientFacingCreditType(kind: CreditKind | string | undefined): string {
  switch (kind) {
    case "discount":
      return "Partnership adjustment";
    case "sponsorship":
      return "Sponsorship credit";
    case "promotional":
      return "Promotional adjustment";
    case "trade-barter":
      return "Trade / barter credit";
    case "custom":
      return "Adjustment";
    default:
      return "Adjustment";
  }
}

export function formatClientFacingPaymentTiming(
  due: PaymentScheduleItem["due"] | string | undefined,
): string {
  switch (due) {
    case "at-acceptance":
      return "Due upon proposal acceptance";
    case "at-contract":
      return "Due at contract signing";
    case "milestone":
      return "Due at project milestone";
    case "on-date":
      return "Due on scheduled date";
    case "remaining":
      return "Final payment";
    default:
      return "Payment";
  }
}

export function formatClientFacingBilling(
  cadence: string | undefined,
): string {
  switch (cadence) {
    case "one-time":
      return "One-time";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
      return "Annual";
    default:
      return "One-time";
  }
}

function withCadenceSuffix(amount: string, cadence: string | undefined): string {
  switch (cadence) {
    case "monthly":
      return `${amount}/month`;
    case "quarterly":
      return `${amount}/quarter`;
    case "annual":
      return `${amount}/year`;
    default:
      return amount;
  }
}

/** Pricing line amount for client surfaces (e.g. `$1,200.00/month`). */
export function formatClientFacingLineAmount(
  amountCents: number,
  cadence: string | undefined,
  currency = "USD",
): string {
  return withCadenceSuffix(formatCents(amountCents, currency), cadence);
}

/**
 * Credit / adjustment amount for client surfaces.
 * Always shown as a reduction: `-$3,250.00` or `-$700.00/month`.
 */
export function formatClientFacingCreditAmount(
  credit: Pick<ProposalCredit, "amountCents" | "appliesTo">,
  currency = "USD",
): string {
  const magnitude = formatCents(Math.abs(credit.amountCents), currency);
  return withCadenceSuffix(`${CREDIT_SIGN}${magnitude}`, credit.appliesTo);
}

/** Final monthly investment label amount (e.g. `$500.00/month`). */
export function formatClientFacingMonthlyInvestment(
  amountCents: number,
  currency = "USD",
): string {
  return withCadenceSuffix(formatCents(amountCents, currency), "monthly");
}
