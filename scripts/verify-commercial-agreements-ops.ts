/**
 * Phase 37A — Commercial Agreements Operations Workspace verification.
 *
 *   npm run verify:commercial-agreements-ops
 *
 * Pure validation + no-provisioning contract checks (no production writes).
 */

import {
  applyCatalogDefaults,
  assertCommercialBaselineMatches,
  commercialProvisioningLabel,
  commercialRecordStatusLabel,
  getCommercialAgreement,
  isCommercialAgreementId,
  listCommercialAgreements,
  parseCommercialSaveBody,
  sanitizeApprovedAddOnIds,
} from "../lib/commercial-agreements";

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function main() {
  console.log("\nPhase 37A — verify:commercial-agreements-ops\n");

  check("catalog still has four agreements", listCommercialAgreements().length === 4);
  check("isCommercialAgreementId accepts operating", isCommercialAgreementId("kxd-operating"));
  check("isCommercialAgreementId rejects garbage", !isCommercialAgreementId("enterprise"));

  const defaults = applyCatalogDefaults("kxd-operating");
  check(
    "catalog defaults for operating",
    defaults.monthlyRetainerAmount === 2000 &&
      defaults.setupFee === 1750 &&
      defaults.monthlyServiceCredits === 7,
  );

  const valid = parseCommercialSaveBody({
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: ["inventory-showroom", "inventory-showroom", "not-real"],
    commercialNotes: " Negotiated review cadence. ",
  });
  check("valid operating save parses", valid.ok === true);
  if (valid.ok) {
    check(
      "add-ons sanitized and deduped",
      valid.input.commercialAddOns.length === 1 &&
        valid.input.commercialAddOns[0] === "inventory-showroom",
    );
    check(
      "notes trimmed",
      valid.input.commercialNotes === "Negotiated review cadence.",
    );
  }

  const tampered = parseCommercialSaveBody({
    commercialAgreementId: "kxd-partnership",
    monthlyRetainerAmount: 9999,
    setupFee: 1000,
    monthlyServiceCredits: 4,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("tampered standard pricing rejected", tampered.ok === false);

  const custom = parseCommercialSaveBody({
    commercialAgreementId: "custom-legacy",
    monthlyRetainerAmount: 1500.5,
    setupFee: 0,
    monthlyServiceCredits: 3,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("custom-legacy accepts negotiated amounts", custom.ok === true);
  if (custom.ok) {
    check(
      "currency normalized to cents",
      custom.input.monthlyRetainerAmount === 1500.5,
    );
  }

  const negative = parseCommercialSaveBody({
    commercialAgreementId: "custom-legacy",
    monthlyRetainerAmount: -1,
    setupFee: null,
    monthlyServiceCredits: null,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("negative monthly rejected", negative.ok === false);

  const fractionalCredits = parseCommercialSaveBody({
    commercialAgreementId: "custom-legacy",
    monthlyRetainerAmount: null,
    setupFee: null,
    monthlyServiceCredits: 1.5,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("fractional credits rejected", fractionalCredits.ok === false);

  const missingAgreement = parseCommercialSaveBody({
    commercialAgreementId: null,
    monthlyRetainerAmount: null,
    setupFee: null,
    monthlyServiceCredits: null,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("missing agreement id rejected", missingAgreement.ok === false);

  const baseline = assertCommercialBaselineMatches("kxd-executive", {
    monthlyStarting: 3500,
    setupFee: 3000,
    monthlyServiceCredits: 12,
  });
  check("executive baseline matches", baseline.ok === true);

  check(
    "record status labels",
    commercialRecordStatusLabel("recorded") === "Recorded" &&
      commercialRecordStatusLabel("unset") === "Unset",
  );
  check(
    "provisioning labels",
    commercialProvisioningLabel("not_provisioned") === "Not provisioned" &&
      commercialProvisioningLabel("plan_assigned") === "Plan assigned",
  );

  const partnership = getCommercialAgreement("kxd-partnership");
  check(
    "sanitize keeps only allowed add-ons",
    sanitizeApprovedAddOnIds("kxd-partnership", [
      "inventory-showroom",
      "bogus",
    ]).join(",") === "inventory-showroom" &&
      Boolean(partnership),
  );

  // Contract: commercial write field allowlist must never include plan fields
  const forbidden = [
    "planKey",
    "planStatus",
    "planEffectiveAt",
    "planAddOnModules",
    "planRemovedModules",
    "planNote",
  ];
  const sampleBody = {
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    commercialNotes: null,
    planKey: "growth",
    planStatus: "active",
  };
  const parsedIgnoreExtra = parseCommercialSaveBody(sampleBody);
  check("parse ignores extra plan fields in body shape", parsedIgnoreExtra.ok === true);
  if (parsedIgnoreExtra.ok) {
    check(
      "parsed input has no plan keys",
      forbidden.every((key) => !(key in parsedIgnoreExtra.input)),
    );
  }

  console.log("\nPhase 37A commercial agreements ops verification passed.\n");
}

main();
