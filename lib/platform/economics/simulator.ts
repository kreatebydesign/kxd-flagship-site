import type { SaasSimulatorInputs, SaasSimulatorOutput, SaasProjectionPoint } from "./types";

function clampRate(n: number, max: number): number {
  return Math.min(max, Math.max(0, n));
}

function projectMonths(
  inputs: SaasSimulatorInputs,
  months: number,
): SaasProjectionPoint[] {
  const churn = clampRate(inputs.monthlyChurnRate, 0.5);
  const growth = clampRate(inputs.annualCustomerGrowthRate, 2);
  const monthlyGrowth = Math.pow(1 + growth, 1 / 12) - 1;
  const grossMargin = clampRate(inputs.grossMarginRate, 1);
  const opCost = Math.max(0, inputs.monthlyOperatingCost);

  const tierCounts = inputs.tiers.map((t) => Math.max(0, t.customerCount));
  const tierPrices = inputs.tiers.map((t) => Math.max(0, t.monthlyPrice));

  const points: SaasProjectionPoint[] = [];

  for (let m = 1; m <= months; m++) {
    if (m > 1) {
      for (let i = 0; i < tierCounts.length; i++) {
        tierCounts[i] = tierCounts[i] * (1 - churn) * (1 + monthlyGrowth);
      }
    }

    const mrr = tierPrices.reduce((sum, price, i) => sum + price * tierCounts[i], 0);
    const grossProfit = mrr * grossMargin;
    const operatingProfitBeforeTax = grossProfit - opCost;

    points.push({
      monthIndex: m,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      operatingProfitBeforeTax: Math.round(operatingProfitBeforeTax),
    });
  }

  return points;
}

export function computeSaasSimulator(inputs: SaasSimulatorInputs): SaasSimulatorOutput {
  const monthlyRecurringRevenue = inputs.tiers.reduce(
    (sum, tier) => sum + tier.monthlyPrice * Math.max(0, tier.customerCount),
    0,
  );
  const annualRecurringRevenue = monthlyRecurringRevenue * 12;
  const churn = clampRate(inputs.monthlyChurnRate, 0.5);
  const grossMargin = clampRate(inputs.grossMarginRate, 1);
  const monthlyAfterChurn = monthlyRecurringRevenue * (1 - churn);
  const annualAfterChurn = monthlyAfterChurn * 12;
  const grossProfitMonthly = monthlyRecurringRevenue * grossMargin;
  const monthlyNetAfterOperatingCost =
    monthlyAfterChurn - Math.max(0, inputs.monthlyOperatingCost);
  const estimatedOperatingProfitBeforeTaxMonthly =
    grossProfitMonthly - Math.max(0, inputs.monthlyOperatingCost);
  const estimatedOperatingProfitBeforeTaxAnnual =
    estimatedOperatingProfitBeforeTaxMonthly * 12;

  const projection12Months = projectMonths(inputs, 12);
  const projection36Months = projectMonths(inputs, 36);
  const hypotheticalArrValuation =
    annualAfterChurn * Math.max(0, inputs.arrRevenueMultiple);

  return {
    monthlyRecurringRevenue,
    annualRecurringRevenue,
    monthlyAfterChurn,
    annualAfterChurn,
    grossProfitMonthly,
    monthlyNetAfterOperatingCost,
    estimatedOperatingProfitBeforeTaxMonthly,
    estimatedOperatingProfitBeforeTaxAnnual,
    projection12Months,
    projection36Months,
    projectionMrrMonth12: projection12Months[11]?.mrr ?? monthlyRecurringRevenue,
    projectionMrrMonth36: projection36Months[35]?.mrr ?? monthlyRecurringRevenue,
    hypotheticalArrValuation,
    isHypothetical: true,
    disclaimer:
      "Hypothetical SaaS scenario only. Tier counts are illustrative — not connected to Stripe, live MRR, or signed KXD OS customer contracts.",
  };
}
