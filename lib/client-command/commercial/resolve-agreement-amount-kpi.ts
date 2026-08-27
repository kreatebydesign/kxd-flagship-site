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
