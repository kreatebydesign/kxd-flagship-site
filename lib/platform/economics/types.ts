import type { PlatformDashboardData } from "../types";

export const PLATFORM_ECONOMICS_CALC_VERSION = "v1";

export type EconomicsConfidence = "low" | "medium" | "high";

export interface EconomicsHourlyRates {
  /** Conservative blended engineering rate (USD/hr). */
  low: number;
  /** Base planning rate (USD/hr). */
  mid: number;
  /** Premium agency replacement rate (USD/hr). */
  high: number;
}

export interface EconomicsValuationInputs {
  hourlyRates: EconomicsHourlyRates;
  /** Hours at 100% completion for a typical subsystem before maturity weighting. */
  baseHoursPerSubsystemAt100: number;
  /** Additional hours credited per Payload collection (integration surface). */
  hoursPerPayloadCollection: number;
  /** Additional hours credited per admin route bundle (complexity proxy). */
  hoursPerAdminRouteBlock: number;
}

export interface SaasTierInput {
  id: string;
  label: string;
  monthlyPrice: number;
  customerCount: number;
}

export interface SaasSimulatorInputs {
  tiers: SaasTierInput[];
  /** Monthly operating cost attributed to SaaS delivery (USD). */
  monthlyOperatingCost: number;
  /** Monthly churn rate as a decimal (e.g. 0.03 = 3%). */
  monthlyChurnRate: number;
  /** ARR revenue multiple for hypothetical scenario valuation. */
  arrRevenueMultiple: number;
}

export interface EnterpriseLicensingInputs {
  /** One-time white-label implementation (USD). Not IP transfer. */
  whiteLabelSetupFee: number;
  /** Recurring white-label license (USD/month). */
  whiteLabelMonthlyLicense: number;
  whiteLabelLicenseMonths: number;
  /** Perpetual enterprise deployment license (USD). Usage rights, not ownership. */
  perpetualEnterpriseLicense: number;
  /**
   * Hypothetical full IP / asset acquisition scenario (USD).
   * Distinct from license or subscription revenue.
   */
  hypotheticalIpAcquisitionPrice: number;
}

export interface PlatformEconomicsInputs {
  valuation: EconomicsValuationInputs;
  saas: SaasSimulatorInputs;
  enterprise: EnterpriseLicensingInputs;
}

export interface ReplacementCostEstimate {
  estimatedHoursLow: number;
  estimatedHoursMid: number;
  estimatedHoursHigh: number;
  replacementCostLowUsd: number;
  replacementCostMidUsd: number;
  replacementCostHighUsd: number;
  confidence: EconomicsConfidence;
  confidenceRationale: string;
  assumptions: string[];
  /** Explicit disclaimer — not fair market value. */
  disclaimer: string;
  subsystemHourCredits: { id: string; name: string; hours: number }[];
}

export interface SaasSimulatorOutput {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  monthlyAfterChurn: number;
  annualAfterChurn: number;
  monthlyNetAfterOperatingCost: number;
  hypotheticalArrValuation: number;
  disclaimer: string;
}

export interface EnterpriseLicensingOutput {
  whiteLabelSetupTotal: number;
  whiteLabelRecurringTotal: number;
  whiteLabelScenarioTotal: number;
  perpetualLicenseTotal: number;
  licenseRevenueDisclaimer: string;
  ipAcquisitionDisclaimer: string;
}

export interface PlatformEconomicsComputed {
  replacementCost: ReplacementCostEstimate;
  saas: SaasSimulatorOutput;
  enterprise: EnterpriseLicensingOutput;
  sourceFingerprint: string;
  overallCompletionPercent: number;
  registrySubsystemCount: number;
}

export interface PlatformEconomicsSnapshotSummary {
  id: string;
  label: string;
  capturedAt: string;
  calculationVersion: string;
  replacementCostMidUsd: number;
  overallCompletionPercent: number;
  monthlyRecurringRevenue: number;
}

export interface PlatformEconomicsHistoryPoint {
  capturedAt: string;
  replacementCostMidUsd: number;
  overallCompletionPercent: number;
  monthlyRecurringRevenue: number;
  label: string;
}

export interface PlatformEconomicsData {
  calculationVersion: string;
  defaults: PlatformEconomicsInputs;
  computed: PlatformEconomicsComputed;
  history: PlatformEconomicsHistoryPoint[];
  recentSnapshots: PlatformEconomicsSnapshotSummary[];
  milestoneContext: string[];
}

export type PlatformEconomicsDashboardContext = Pick<
  PlatformDashboardData,
  "overview" | "subsystems" | "health" | "phases"
>;
