import type { EnterpriseLicensingInputs, EnterpriseLicensingOutput } from "./types";

export function computeEnterpriseLicensing(
  inputs: EnterpriseLicensingInputs,
): EnterpriseLicensingOutput {
  const whiteLabelRecurringTotal =
    Math.max(0, inputs.whiteLabelMonthlyLicense) *
    Math.max(0, inputs.whiteLabelLicenseMonths);
  const whiteLabelSetupTotal = Math.max(0, inputs.whiteLabelSetupFee);
  const whiteLabelScenarioTotal = whiteLabelSetupTotal + whiteLabelRecurringTotal;
  const perpetualLicenseTotal = Math.max(0, inputs.perpetualEnterpriseLicense);

  return {
    whiteLabelSetupTotal,
    whiteLabelRecurringTotal,
    whiteLabelScenarioTotal,
    perpetualLicenseTotal,
    licenseRevenueDisclaimer:
      "License and setup fees model usage rights and services. They do not transfer ownership of KXD OS intellectual property.",
    ipAcquisitionDisclaimer:
      "Full IP acquisition is a separate hypothetical scenario for strategic planning. It must not be combined with recurring license or subscription revenue.",
  };
}
