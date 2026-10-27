import { createHash } from "crypto";
import type { PlatformEconomicsComputed, PlatformEconomicsDashboardContext, PlatformEconomicsInputs } from "./types";
import { PLATFORM_ECONOMICS_CALC_VERSION } from "./types";
import { computeEnterpriseLicensing } from "./enterprise";
import { computeReplacementCostEstimate } from "./valuation";
import { computeSaasSimulator } from "./simulator";

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
): PlatformEconomicsComputed {
  const replacementCost = computeReplacementCostEstimate(
    ctx.subsystems,
    ctx.health,
    ctx.overview.overallCompletionPercent,
    inputs.valuation,
  );
  const saas = computeSaasSimulator(inputs.saas);
  const enterprise = computeEnterpriseLicensing(inputs.enterprise);

  return {
    replacementCost,
    saas,
    enterprise,
    sourceFingerprint: buildEconomicsSourceFingerprint(ctx),
    overallCompletionPercent: ctx.overview.overallCompletionPercent,
    registrySubsystemCount: ctx.subsystems.length,
  };
}
