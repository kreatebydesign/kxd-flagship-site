import { createHash } from "crypto";
import type { PlatformCommercialEvidence } from "./types";
import { buildCommercialValuationView } from "./commercial";
import type {
  PlatformEconomicsComputed,
  PlatformEconomicsDashboardContext,
  PlatformEconomicsInputs,
} from "./types";
import { PLATFORM_ECONOMICS_CALC_VERSION } from "./types";
import { computeEnterpriseLicensing } from "./enterprise";
import { computeReplacementCostEstimate } from "./valuation";
import { computeSaasSimulator } from "./simulator";

const EMPTY_EVIDENCE: PlatformCommercialEvidence = {
  studioPortfolioMrrUsd: 0,
  studioActiveRetainerServices: 0,
  studioPayingClientRows: 0,
  loadedAt: "",
};

export function buildEconomicsSourceFingerprint(
  ctx: PlatformEconomicsDashboardContext,
): string {
  const payload = {
    v: PLATFORM_ECONOMICS_CALC_VERSION,
    overall: ctx.overview.overallCompletionPercent,
    subsystems: ctx.subsystems.map((s) => ({
      id: s.id,
      completion: s.completionPercent,
      status: s.status,
    })),
    health: ctx.health,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

export function computePlatformEconomics(
  ctx: PlatformEconomicsDashboardContext,
  inputs: PlatformEconomicsInputs,
  commercialEvidence?: PlatformCommercialEvidence | null,
): PlatformEconomicsComputed {
  const replacementCost = computeReplacementCostEstimate(
    ctx.subsystems,
    ctx.health,
    ctx.overview.overallCompletionPercent,
    inputs.valuation,
  );
  const saas = computeSaasSimulator(inputs.saas);
  const enterprise = computeEnterpriseLicensing(inputs.enterprise);

  const commercial = {
    monthlyRecurringRevenue: saas.monthlyRecurringRevenue,
    annualRecurringRevenue: saas.annualRecurringRevenue,
    hypotheticalSaasArrValuation: saas.hypotheticalArrValuation,
    whiteLabelScenarioTotal: enterprise.whiteLabelScenarioTotal,
    perpetualLicenseTotal: enterprise.perpetualLicenseTotal,
    disclaimer:
      "Commercial figures are hypothetical scenarios from editable inputs. They are not live revenue, pipeline, or a commitment to transact.",
  };

  const evidence = commercialEvidence ?? EMPTY_EVIDENCE;
  const commercialValuation = buildCommercialValuationView(
    evidence,
    {
      overallCompletionPercent: ctx.overview.overallCompletionPercent,
      registrySubsystemCount: ctx.subsystems.length,
      saas,
      enterprise,
    },
    inputs.enterprise.hypotheticalIpAcquisitionPrice,
  );

  return {
    replacementCost,
    saas,
    enterprise,
    commercial,
    commercialValuation,
    sourceFingerprint: buildEconomicsSourceFingerprint(ctx),
    overallCompletionPercent: ctx.overview.overallCompletionPercent,
    registrySubsystemCount: ctx.subsystems.length,
  };
}
