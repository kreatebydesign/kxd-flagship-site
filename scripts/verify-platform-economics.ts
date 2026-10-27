import assert from "node:assert/strict";
import { DEFAULT_PLATFORM_ECONOMICS_INPUTS } from "../lib/platform/economics/constants.ts";
import { computePlatformEconomics } from "../lib/platform/economics/compute.ts";
import { PLATFORM_ECONOMICS_CALC_VERSION } from "../lib/platform/economics/types.ts";

const ctx = {
  overview: {
    overallCompletionPercent: 80,
    sharedCorePercent: 78,
    agencyEditionPercent: 72,
    platformLayerPercent: 85,
    meta: {
      currentPhase: "17",
      currentPhaseTitle: "Lead Funnel",
      version: "0.1.0",
      editionLabel: "KXD Core",
      buildDate: "2026-10-27",
    },
  },
  subsystems: [
    {
      id: "test",
      name: "Test",
      category: "Platform",
      owner: "shared-core" as const,
      maturity: "beta" as const,
      completionPercent: 90,
      status: "stable" as const,
      dependencies: [],
      lastCompletedPhase: "11D",
      currentPhase: "—",
    },
  ],
  health: {
    payloadCollections: 100,
    adminRoutes: 150,
    portalRoutes: 50,
    salesRoutes: 12,
    payloadHooks: 18,
    automationModules: 12,
    automationModulesConnected: 8,
    portalModules: 14,
    portalModulesProduction: 11,
    sharedCoreSubsystems: 29,
    agencySubsystems: 4,
    platformSubsystems: 5,
    kxdEditionModules: 22,
    libPlatformModules: 47,
  },
  phases: [],
};

const result = computePlatformEconomics(ctx, DEFAULT_PLATFORM_ECONOMICS_INPUTS);

assert.equal(PLATFORM_ECONOMICS_CALC_VERSION, "v2");
assert.ok(result.replacementCost.replacementCostMidUsd > 0);
assert.ok(result.saas.monthlyRecurringRevenue > 0);
assert.ok(result.saas.projection12Months.length === 12);
assert.ok(result.saas.projection36Months.length === 36);
assert.ok(result.enterprise.whiteLabelScenarioTotal > 0);
assert.ok(result.commercial.hypotheticalSaasArrValuation > 0);
assert.ok(result.replacementCost.subsystemBreakdown.length > 0);
assert.equal(result.commercialValuation.established, false);
assert.match(result.commercialValuation.headline, /not yet established/i);
assert.match(result.replacementCost.disclaimer, /not verified fair market value/i);
assert.match(result.enterprise.ipAcquisitionDisclaimer, /separate hypothetical/i);

console.log("verify-platform-economics: ok");
