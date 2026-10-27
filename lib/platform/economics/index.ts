export type {
  CommercialValuationView,
  CommercialValueSummary,
  HypotheticalExitScenario,
  SaasProjectionPoint,
  EconomicsConfidence,
  EconomicsHourlyRates,
  EconomicsValuationInputs,
  EnterpriseLicensingInputs,
  EnterpriseLicensingOutput,
  IntegrationReadiness,
  PlatformEconomicsComputed,
  PlatformEconomicsData,
  PlatformEconomicsHistoryPoint,
  PlatformEconomicsInputs,
  PlatformEconomicsSnapshotSummary,
  ReplacementCostEstimate,
  SaasSimulatorInputs,
  SaasSimulatorOutput,
  SaasTierInput,
  SubsystemValuationBreakdownRow,
  ValuationHeroMetrics,
  PlatformCommercialEvidence,
  PlatformEconomicsDashboardContext,
} from "./types";

export { PLATFORM_ECONOMICS_CALC_VERSION } from "./types";
export { DEFAULT_PLATFORM_ECONOMICS_INPUTS, DEFAULT_SAAS_TIERS } from "./constants";
export { computePlatformEconomics, buildEconomicsSourceFingerprint } from "./compute";
export { computeReplacementCostEstimate } from "./valuation";
export { computeSaasSimulator } from "./simulator";
export { computeEnterpriseLicensing } from "./enterprise";
