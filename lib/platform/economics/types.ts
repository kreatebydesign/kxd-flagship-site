import type {
  PlatformDashboardData,
  PlatformMaturity,
  PlatformSubsystemStatus,
} from "../types";

export const PLATFORM_ECONOMICS_CALC_VERSION = "v2";

export type PlatformCommercialEvidence = {
  studioPortfolioMrrUsd: number;
  studioActiveRetainerServices: number;
  studioPayingClientRows: number;
  loadedAt: string;
};

export type EconomicsConfidence = "low" | "medium" | "high";

export type IntegrationReadiness = "limited" | "emerging" | "production-ready";

export interface SubsystemValuationBreakdownRow {
  id: string;
  name: string;
  category: string;
  owner: string;
  completionPercent: number;
  status: PlatformSubsystemStatus;
  maturity: PlatformMaturity;
  estimatedHours: number;
  replacementCostMidUsd: number;
  integrationReadiness: IntegrationReadiness;
  maturityAdjustmentLabel: string;
  technicalDebtAdjustmentPercent: number;
  contributionPercent: number;
}

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
  /** Annual customer growth as a decimal (e.g. 0.12 = 12%). */
  annualCustomerGrowthRate: number;
  /** Gross margin on recurring revenue (decimal, e.g. 0.75). */
  grossMarginRate: number;
  /** ARR revenue multiple for hypothetical scenario valuation. */
  arrRevenueMultiple: number;
}

export interface EnterpriseLicensingInputs {
  /** One-time white-label implementation (USD). Not IP transfer. */
  whiteLabelSetupFee: number;
  whiteLabelDealCount: number;
  /** Recurring white-label license (USD/month). */
  whiteLabelMonthlyLicense: number;
  whiteLabelLicenseMonths: number;
  /** Annual enterprise license fee per deal (USD/year). */
  annualEnterpriseLicenseFee: number;
  annualEnterpriseDealCount: number;
  /** Perpetual enterprise deployment license (USD). Usage rights, not ownership. */
  perpetualEnterpriseLicense: number;
  perpetualEnterpriseDealCount: number;
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
  /** Shared integration surface hours (allocated across subsystems in breakdown). */
  integrationHoursMid: number;
  subsystemBreakdown: SubsystemValuationBreakdownRow[];
}

export interface HypotheticalExitScenario {
  id: string;
  label: string;
  description: string;
  valueUsd: number;
}

export interface CommercialValuationView {
  established: boolean;
  headline: string;
  evidenceSummary: string[];
  actualProduct: {
    mrrUsd: number;
    payingCustomers: number;
    source: string;
  } | null;
  studioAgencyContext: {
    mrrUsd: number;
    payingClientRows: number;
    activeRetainerServices: number;
    disclaimer: string;
  };
  hypotheticalScenarios: HypotheticalExitScenario[];
  replacementCostDistinction: string;
}

export interface CommercialValueSummary {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  hypotheticalSaasArrValuation: number;
  whiteLabelScenarioTotal: number;
  perpetualLicenseTotal: number;
  disclaimer: string;
}

export interface ValuationHeroMetrics {
  calculatedAt: string;
  replacementCostMidUsd: number;
  replacementCostLowUsd: number;
  replacementCostHighUsd: number;
  estimatedHoursMid: number;
  overallCompletionPercent: number;
  registrySubsystemCount: number;
  confidence: EconomicsConfidence;
  changeMidUsd: number | null;
  changeMidPercent: number | null;
  previousSnapshotLabel: string | null;
  previousSnapshotCapturedAt: string | null;
}

export interface SaasProjectionPoint {
  monthIndex: number;
  mrr: number;
  arr: number;
  operatingProfitBeforeTax: number;
}

export interface SaasSimulatorOutput {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  monthlyAfterChurn: number;
  annualAfterChurn: number;
  grossProfitMonthly: number;
  monthlyNetAfterOperatingCost: number;
  estimatedOperatingProfitBeforeTaxMonthly: number;
  estimatedOperatingProfitBeforeTaxAnnual: number;
  projection12Months: SaasProjectionPoint[];
  projection36Months: SaasProjectionPoint[];
  projectionMrrMonth12: number;
  projectionMrrMonth36: number;
  hypotheticalArrValuation: number;
  isHypothetical: true;
  disclaimer: string;
}

export interface EnterpriseLicensingOutput {
  whiteLabelSetupTotal: number;
  whiteLabelRecurringTotal: number;
  whiteLabelScenarioTotal: number;
  annualEnterpriseBookTotal: number;
  perpetualLicenseTotal: number;
  oneTimeRevenueTotal: number;
  recurringRevenueAnnualized: number;
  licenseRevenueDisclaimer: string;
  ipAcquisitionDisclaimer: string;
}

export interface PlatformEconomicsComputed {
  replacementCost: ReplacementCostEstimate;
  saas: SaasSimulatorOutput;
  enterprise: EnterpriseLicensingOutput;
  commercial: CommercialValueSummary;
  commercialValuation: CommercialValuationView;
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
  valuationHero: ValuationHeroMetrics;
  history: PlatformEconomicsHistoryPoint[];
  recentSnapshots: PlatformEconomicsSnapshotSummary[];
  milestoneContext: string[];
  commercialEvidence: PlatformCommercialEvidence;
}

export type PlatformEconomicsDashboardContext = Pick<
  PlatformDashboardData,
  "overview" | "subsystems" | "health" | "phases"
>;
