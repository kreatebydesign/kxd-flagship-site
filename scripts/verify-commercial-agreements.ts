/**
 * Phase 36A — Commercial agreement alignment verification.
 *
 *   npm run verify:commercial-agreements
 */

import {
  assertCommercialBaselineMatches,
  getCommercialAgreement,
  listCommercialAgreements,
  sanitizeApprovedAddOnIds,
} from "../lib/commercial-agreements";
import {
  emptyLaunchWizardPayload,
  normalizeLaunchWizardPayload,
  resolvePackageModuleSelections,
  validatePackageStep,
} from "../lib/client-launch-wizard";
import { PARTNERSHIP_PACKAGES } from "../lib/partnerships/packages";

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function main() {
  console.log("\nPhase 36A — verify:commercial-agreements\n");

  const agreements = listCommercialAgreements();
  check("four internal agreements exist", agreements.length === 4);

  const partnership = getCommercialAgreement("kxd-partnership");
  const operating = getCommercialAgreement("kxd-operating");
  const executive = getCommercialAgreement("kxd-executive");
  const custom = getCommercialAgreement("custom-legacy");

  check("KXD Partnership baseline", Boolean(
    partnership &&
      partnership.monthlyStarting === 1250 &&
      partnership.setupFee === 1000 &&
      partnership.monthlyServiceCredits === 4 &&
      partnership.entitlementPresetId === "starter" &&
      partnership.name === "KXD Partnership",
  ));

  check("KXD Operating Partnership baseline + recommended", Boolean(
    operating &&
      operating.monthlyStarting === 2000 &&
      operating.setupFee === 1750 &&
      operating.monthlyServiceCredits === 7 &&
      operating.entitlementPresetId === "growth" &&
      operating.recommended === true &&
      operating.name === "KXD Operating Partnership",
  ));

  check("KXD Executive Partnership baseline", Boolean(
    executive &&
      executive.monthlyStarting === 3500 &&
      executive.setupFee === 3000 &&
      executive.monthlyServiceCredits === 12 &&
      executive.entitlementPresetId === "premium" &&
      executive.name === "KXD Executive Partnership",
  ));

  check("Custom / Legacy invents no defaults", Boolean(
    custom &&
      custom.monthlyStarting === null &&
      custom.setupFee === null &&
      custom.monthlyServiceCredits === null &&
      custom.entitlementPresetId === "custom",
  ));

  check(
    "public package names remain the commercial source",
    PARTNERSHIP_PACKAGES.every((pkg) =>
      agreements.some((row) => row.publicPackageId === pkg.id && row.name === pkg.name),
    ),
  );

  check(
    "tampered operating price rejected",
    assertCommercialBaselineMatches("kxd-operating", {
      monthlyStarting: 9999,
      setupFee: 1750,
      monthlyServiceCredits: 7,
    }).ok === false,
  );

  check(
    "exact operating baseline accepted",
    assertCommercialBaselineMatches("kxd-operating", {
      monthlyStarting: 2000,
      setupFee: 1750,
      monthlyServiceCredits: 7,
    }).ok === true,
  );

  check(
    "inventory never auto-approved",
    sanitizeApprovedAddOnIds("kxd-executive", []).length === 0 &&
      !sanitizeApprovedAddOnIds("kxd-operating", []).includes("inventory-showroom"),
  );

  check(
    "explicit inventory approval preserved when requested",
    sanitizeApprovedAddOnIds("kxd-operating", ["inventory-showroom"]).includes(
      "inventory-showroom",
    ),
  );

  const empty = emptyLaunchWizardPayload();
  check(
    "new drafts default to Operating / Growth",
    empty.package.commercialAgreementId === "kxd-operating" &&
      empty.package.packageId === "growth" &&
      empty.package.monthlyServiceCredits === 7 &&
      empty.package.approvedAddOnIds.length === 0,
  );

  const legacyDraft = normalizeLaunchWizardPayload({
    identity: empty.identity,
    package: { packageId: "starter", displayName: "" },
    experience: empty.experience,
    modules: resolvePackageModuleSelections("starter"),
    infrastructure: empty.infrastructure,
    team: [],
    automation: empty.automation,
  });
  check(
    "legacy drafts load as custom-legacy without invented prices",
    legacyDraft.package.commercialAgreementId === "custom-legacy" &&
      legacyDraft.package.packageId === "starter" &&
      legacyDraft.package.monthlyStarting === null &&
      legacyDraft.package.monthlyServiceCredits === null,
  );

  const operatingDraft = emptyLaunchWizardPayload();
  operatingDraft.modules = resolvePackageModuleSelections("growth");
  check(
    "operating package step validates",
    validatePackageStep(operatingDraft).length === 0,
  );

  const tampered = emptyLaunchWizardPayload();
  tampered.package.monthlyStarting = 1;
  check(
    "tampered commercial values fail package validation",
    validatePackageStep(tampered).some((issue) => issue.code === "commercial.tampered"),
  );

  console.log("\nAll commercial agreement checks passed.\n");
}

main();
