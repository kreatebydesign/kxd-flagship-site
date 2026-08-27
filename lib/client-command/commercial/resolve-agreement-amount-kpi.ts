import { formatCents } from "@/lib/proposal-builder/money";
import type { DirectAgreementTerms } from "@/lib/direct-agreement/types";
import type { StructuredPaymentTerms } from "@/lib/proposal-lifecycle/types";

/**
 * Operator-facing commercial summary amount for agreement KPI cards.
 * Recurring Direct Agreements with no one-time invoice show monthly rate — not $0.00.
 */
export function resolveAgreementAmountKpi(input: {
  daTerms?: DirectAgreementTerms | null;
  structuredPaymentTerms?: StructuredPaymentTerms | null;
}): { label: string; value: string } {
  const oneTimeCents =
    input.daTerms?.oneTimeAmountCents ??
    input.structuredPaymentTerms?.oneTimeTotalCents ??
    0;
  const monthlyCents =
    input.daTerms?.monthlyAmountCents ??
    input.structuredPaymentTerms?.monthlyTotalCents ??
    0;
  const currency = input.daTerms?.currency ?? input.structuredPaymentTerms?.currency ?? "USD";

  if (oneTimeCents > 0) {
    return {
      label: "Invoice amount",
      value: formatCents(oneTimeCents, currency),
    };
  }

  if (monthlyCents > 0) {
    return {
      label: "Monthly rate",
      value: formatCents(monthlyCents, currency),
    };
  }

  return { label: "Invoice amount", value: "—" };
}

/**
 * Direct Agreement PDF cover-page investment lines (page 1 summary box).
 * Omits zero one-time amounts; recurring-only agreements show a single monthly line.
 */
export function resolveDirectAgreementInvestmentLines(input: {
  daTerms?: DirectAgreementTerms | null;
  structuredPaymentTerms: StructuredPaymentTerms;
}): string[] {
  const t = input.structuredPaymentTerms;
  const oneTimeCents =
    input.daTerms?.oneTimeAmountCents ?? t.oneTimeTotalCents ?? 0;
  const monthlyCents =
    input.daTerms?.monthlyAmountCents ?? t.monthlyTotalCents ?? 0;
  const currency = input.daTerms?.currency ?? t.currency ?? "USD";
  const showMonthly = monthlyCents > 0 && t.recurring.cadence !== "none";

  if (oneTimeCents > 0 && showMonthly) {
    return [
      formatCents(oneTimeCents, currency),
      `${formatCents(monthlyCents, currency)} per month`,
    ];
  }

  if (oneTimeCents > 0) {
    return [`${formatCents(oneTimeCents, currency)} prepaid`];
  }

  if (showMonthly) {
    return [`${formatCents(monthlyCents, currency)} per month`];
  }

  return ["—"];
}
