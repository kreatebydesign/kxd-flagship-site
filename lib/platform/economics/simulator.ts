import type { SaasSimulatorInputs, SaasSimulatorOutput } from "./types";

export function computeSaasSimulator(inputs: SaasSimulatorInputs): SaasSimulatorOutput {
  const monthlyRecurringRevenue = inputs.tiers.reduce(
    (sum, tier) => sum + tier.monthlyPrice * Math.max(0, tier.customerCount),
    0,
  );
  const annualRecurringRevenue = monthlyRecurringRevenue * 12;
  const churn = Math.min(0.5, Math.max(0, inputs.monthlyChurnRate));
  const monthlyAfterChurn = monthlyRecurringRevenue * (1 - churn);
  const annualAfterChurn = monthlyAfterChurn * 12;
  const monthlyNetAfterOperatingCost =
    monthlyAfterChurn - Math.max(0, inputs.monthlyOperatingCost);
  const hypotheticalArrValuation =
    annualAfterChurn * Math.max(0, inputs.arrRevenueMultiple);

  return {
    monthlyRecurringRevenue,
    annualRecurringRevenue,
    monthlyAfterChurn,
    annualAfterChurn,
    monthlyNetAfterOperatingCost,
    hypotheticalArrValuation,
    disclaimer:
      "Hypothetical SaaS scenario only. Not connected to Stripe, live MRR, or signed customer contracts.",
  };
}
