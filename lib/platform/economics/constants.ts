import type { PlatformEconomicsInputs } from "./types";

export const DEFAULT_SAAS_TIERS = [
  { id: "starter", label: "Starter (hypothetical)", monthlyPrice: 99, customerCount: 12 },
  { id: "professional", label: "Professional (hypothetical)", monthlyPrice: 249, customerCount: 6 },
  { id: "enterprise", label: "Enterprise (hypothetical)", monthlyPrice: 499, customerCount: 2 },
  { id: "white-label", label: "White Label (hypothetical)", monthlyPrice: 999, customerCount: 1 },
] as const;

export const DEFAULT_PLATFORM_ECONOMICS_INPUTS: PlatformEconomicsInputs = {
  valuation: {
    hourlyRates: { low: 150, mid: 225, high: 325 },
    baseHoursPerSubsystemAt100: 80,
    hoursPerPayloadCollection: 4,
    hoursPerAdminRouteBlock: 12,
  },
  saas: {
    tiers: DEFAULT_SAAS_TIERS.map((t) => ({ ...t })),
    monthlyOperatingCost: 8500,
    monthlyChurnRate: 0.025,
    arrRevenueMultiple: 6,
  },
  enterprise: {
    whiteLabelSetupFee: 45000,
    whiteLabelMonthlyLicense: 2500,
    whiteLabelLicenseMonths: 12,
    perpetualEnterpriseLicense: 185000,
    hypotheticalIpAcquisitionPrice: 2500000,
  },
};
