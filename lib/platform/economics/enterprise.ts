import type { EnterpriseLicensingInputs, EnterpriseLicensingOutput } from "./types";

export function computeEnterpriseLicensing(
  inputs: EnterpriseLicensingInputs,
): EnterpriseLicensingOutput {
  const whiteLabelDeals = Math.max(0, inputs.whiteLabelDealCount);
  const whiteLabelRecurringTotal =
    Math.max(0, inputs.whiteLabelMonthlyLicense) *
    Math.max(0, inputs.whiteLabelLicenseMonths) *
    whiteLabelDeals;
  const whiteLabelSetupTotal = Math.max(0, inputs.whiteLabelSetupFee) * whiteLabelDeals;
  const whiteLabelScenarioTotal = whiteLabelSetupTotal + whiteLabelRecurringTotal;

  const annualDeals = Math.max(0, inputs.annualEnterpriseDealCount);
  const annualEnterpriseBookTotal =
    Math.max(0, inputs.annualEnterpriseLicenseFee) * annualDeals;

  const perpetualDeals = Math.max(0, inputs.perpetualEnterpriseDealCount);
  const perpetualLicenseTotal =
    Math.max(0, inputs.perpetualEnterpriseLicense) * perpetualDeals;

  const oneTimeRevenueTotal = whiteLabelSetupTotal + perpetualLicenseTotal;
  const recurringRevenueAnnualized =
    Math.max(0, inputs.whiteLabelMonthlyLicense) * 12 * whiteLabelDeals +
    annualEnterpriseBookTotal;

  return {
    whiteLabelSetupTotal,
    whiteLabelRecurringTotal,
    whiteLabelScenarioTotal,
    annualEnterpriseBookTotal,
    perpetualLicenseTotal,
    oneTimeRevenueTotal,
    recurringRevenueAnnualized,
    licenseRevenueDisclaimer:
      "License and setup fees model usage rights and services. They do not transfer ownership of KXD OS intellectual property.",
    ipAcquisitionDisclaimer:
      "Full IP acquisition is a separate hypothetical scenario for strategic planning. It must not be combined with recurring license or subscription revenue.",
  };
}
