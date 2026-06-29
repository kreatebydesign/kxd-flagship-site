import type { EstimateItemInput, PricingTotals } from "./types";

export interface PricingOptions {
  discountType?: "none" | "percent" | "fixed" | null;
  discountValue?: number | null;
  taxRate?: number | null;
}

function lineAmount(item: EstimateItemInput): number {
  const type = String(item.itemType ?? "fixed");
  const unit = Number(item.unitPrice ?? 0);
  const qty = Number(item.quantity ?? 1);
  const hours = Number(item.hours ?? 0);

  if (type === "hourly") return unit * hours;
  if (type === "quantity" || type === "optional-upgrade") return unit * qty;
  if (type === "monthly-retainer") return unit;
  return unit * (qty > 0 ? qty : 1);
}

export function calculateEstimateTotals(
  items: EstimateItemInput[],
  options?: PricingOptions,
): PricingTotals {
  let oneTimeTotal = 0;
  let recurringTotal = 0;
  let optionalOneTimeTotal = 0;
  let optionalRecurringTotal = 0;
  let discountableOneTime = 0;
  let discountableRecurring = 0;

  for (const item of items) {
    const included = item.includedByDefault !== false && !item.isOptional;
    if (!included && item.isOptional) {
      const amt = lineAmount(item);
      if (item.isRecurring) optionalRecurringTotal += amt;
      else optionalOneTimeTotal += amt;
      continue;
    }

    const amt = lineAmount(item);
    if (item.isRecurring) {
      recurringTotal += amt;
      if (item.discountable) discountableRecurring += amt;
    } else {
      oneTimeTotal += amt;
      if (item.discountable) discountableOneTime += amt;
    }
  }

  let discountAmount = 0;
  const discountType = options?.discountType ?? "none";
  const discountValue = Number(options?.discountValue ?? 0);

  if (discountType === "percent" && discountValue > 0) {
    discountAmount =
      (discountableOneTime + discountableRecurring) * (discountValue / 100);
  } else if (discountType === "fixed" && discountValue > 0) {
    discountAmount = discountValue;
  }

  const taxRate = Number(options?.taxRate ?? 0);
  const taxableOneTime = Math.max(0, oneTimeTotal - discountAmount * (oneTimeTotal > 0 ? 1 : 0));
  const taxAmount = taxRate > 0 ? taxableOneTime * (taxRate / 100) : 0;

  const grandOneTimeTotal = Math.max(0, oneTimeTotal - discountAmount) + taxAmount;
  const grandRecurringTotal = recurringTotal;
  const projectedAnnualValue = grandOneTimeTotal + grandRecurringTotal * 12;

  return {
    oneTimeTotal,
    recurringTotal,
    optionalOneTimeTotal,
    optionalRecurringTotal,
    discountAmount,
    taxAmount,
    grandOneTimeTotal,
    grandRecurringTotal,
    projectedAnnualValue,
    lineCount: items.length,
  };
}

export function mergePricingIntoProposalFields(
  totals: PricingTotals,
): Record<string, unknown> {
  return {
    investment: totals.grandOneTimeTotal,
    recurringAmount: totals.grandRecurringTotal,
    pricingSnapshot: totals,
  };
}
