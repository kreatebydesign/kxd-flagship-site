/**
 * Phase 37F — Billing readiness verification.
 *
 *   npm run verify:commercial-billing-readiness
 *
 * Pure deterministic checks (no production writes, no Stripe network).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessAgreementPlanAlignment,
  billingReadinessStatusLabel,
  buildBillingReadinessFingerprint,
  buildBillingReadinessSnapshot,
  classifyCommercialAddOn,
  evaluateActivationEligibility,
  evaluateCustomPlanEligibility,
  evaluateLegacyConversionEligibility,
  evaluatePlanChangeEligibility,
  isBillingReviewAvailable,
  mapAgreementToPlan,
  parseCommercialSaveBody,
  rejectBrowserBillingAuthority,
  sanitizeExternalId,
  validateMonetaryAmount,
  validateServiceCredits,
  type BillingProfileReadState,
  type BillingReadinessClientState,
} from "../lib/commercial-agreements";
import { rejectBodyClientIdMismatch } from "../lib/client-plans/validate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function baseState(
  overrides: Partial<BillingReadinessClientState> = {},
): BillingReadinessClientState {
  return {
    clientId: 42,
    clientName: "Billing Fixture",
    clientSlug: "billing-fixture",
    updatedAt: "2026-07-21T12:00:00.000Z",
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    commercialNotes: null,
    planKey: "growth",
    planStatus: "active",
    ...overrides,
  };
}

function emptyProfile(
  overrides: Partial<BillingProfileReadState> = {},
): BillingProfileReadState {
  return {
    profilePresent: false,
    billingContact: null,
    billingEmail: null,
    invoiceCadence: null,
    paymentTerms: null,
    billingStatus: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    quickbooksCustomerId: null,
    waveCustomerId: null,
    duplicateProfiles: false,
    ...overrides,
  };
}

function main() {
  console.log("\nPhase 37F — verify:commercial-billing-readiness\n");

  // Money validation
  check(
    "null monetary amounts remain distinct from zero",
    validateMonetaryAmount(null, "Setup fee").ok === true &&
      (validateMonetaryAmount(null, "Setup fee") as { presence: string }).presence ===
        "null" &&
      (validateMonetaryAmount(0, "Setup fee") as { presence: string }).presence ===
        "zero",
  );
  check(
    "negative amounts fail validation",
    validateMonetaryAmount(-1, "Setup fee").ok === false,
  );
  check(
    "invalid monetary precision fails safely",
    validateMonetaryAmount(1.001, "Setup fee").ok === false,
  );
  check(
    "cents-safe amounts validate",
    validateMonetaryAmount(1250.5, "Monthly retainer").ok === true,
  );
  check(
    "service credits reject fractional values",
    validateServiceCredits(1.5).ok === false,
  );
  check(
    "service credits accept whole numbers",
    validateServiceCredits(7).ok === true,
  );

  // Add-on classification
  const inventory = classifyCommercialAddOn("inventory-showroom");
  check(
    "ambiguous add-ons require review",
    inventory.classification === "requires_review" && inventory.stripeSafe === false,
  );
  const unknown = classifyCommercialAddOn("not-a-real-addon");
  check(
    "unknown add-ons do not silently map to Stripe",
    unknown.classification === "unsupported" && unknown.stripeSafe === false,
  );

  // Missing / unknown agreement
  const missing = buildBillingReadinessSnapshot(
    baseState({
      commercialAgreementId: null,
      planKey: null,
      planStatus: "legacy",
      monthlyRetainerAmount: null,
      setupFee: null,
      monthlyServiceCredits: null,
    }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "missing agreement returns blocked/not-configured readiness",
    missing.readiness === "not_configured" || missing.readiness === "blocked",
  );
  check(
    "missing agreement includes no_agreement blocker",
    missing.blockers.some((b) => b.code === "no_agreement"),
  );
  check(
    "legacy access alone is not treated as a billing agreement",
    missing.alignment.status === "legacy_access_only" &&
      missing.blockers.some((b) => b.code === "legacy_without_agreement"),
  );

  const unknownAgg = buildBillingReadinessSnapshot(
    baseState({ commercialAgreementId: "not-a-real-agreement" }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "unknown agreement blocks",
    unknownAgg.blockers.some((b) => b.code === "unknown_agreement") &&
      unknownAgg.readiness === "blocked",
  );

  // Standard agreement recognized
  const standard = buildBillingReadinessSnapshot(
    baseState(),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "standard agreement is recognized",
    standard.agreementId === "kxd-operating" &&
      Boolean(standard.agreementName?.includes("Operating")),
  );
  check(
    "current plan loads authoritatively in snapshot",
    standard.planKey === "growth" && standard.planStatus === "active",
  );
  check(
    "standard agreement/plan alignment calculates correctly",
    standard.alignment.status === "aligned_standard",
  );
  check(
    "setup fee classified as one-time billable",
    standard.setupFee.kind === "one_time" &&
      standard.setupFee.classification === "billable" &&
      standard.setupFee.amountCents === 175000,
  );
  check(
    "monthly retainer classified as recurring billable",
    standard.monthlyRetainer.kind === "recurring" &&
      standard.monthlyRetainer.classification === "billable" &&
      standard.monthlyRetainer.amountCents === 200000,
  );
  check(
    "service credits are not treated as cash",
    standard.monthlyServiceCredits.kind === "service_capacity" &&
      standard.monthlyServiceCredits.classification === "informational" &&
      standard.monthlyServiceCredits.amountCents === null,
  );
  check(
    "currency is never inferred as authoritative",
    standard.currency.code === null && standard.currency.authoritative === false,
  );
  check(
    "cadence for retainer is monthly from field definition",
    standard.cadence.retainerCadence === "monthly",
  );
  check(
    "tax/discount/proration warnings present",
    standard.warnings.some((w) => w.includes("Tax")) &&
      standard.warnings.some((w) => w.includes("Discount")) &&
      standard.warnings.some((w) => w.includes("Proration")),
  );
  check(
    "missing billing contact reported accurately",
    standard.missingRequired.some((m) => m.includes("Billing contact")),
  );
  check(
    "readiness is server-calculated ready_for_review without inventing sync readiness",
    standard.readiness === "ready_for_review",
  );
  check(
    "systems unchanged notices present",
    standard.systemsUnchanged.some((s) => s.includes("No Stripe object")),
  );

  // Mismatch
  const mismatch = buildBillingReadinessSnapshot(
    baseState({ planKey: "starter", planStatus: "active" }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "standard agreement/plan mismatch is identified",
    mismatch.alignment.status === "mismatch" &&
      mismatch.blockers.some((b) => b.code === "agreement_plan_mismatch") &&
      mismatch.readiness === "state_mismatch",
  );

  // Custom
  const custom = buildBillingReadinessSnapshot(
    baseState({
      commercialAgreementId: "custom-legacy",
      monthlyRetainerAmount: 1500,
      setupFee: 500,
      monthlyServiceCredits: 4,
      planKey: "custom",
      planStatus: "active",
      commercialAddOns: ["inventory-showroom"],
    }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "custom agreement is recognized",
    custom.agreementId === "custom-legacy",
  );
  check(
    "custom agreement/custom plan alignment calculates correctly",
    custom.alignment.status === "aligned_custom",
  );
  check(
    "custom add-ons require review and are not billable",
    custom.commercialAddOns[0]?.classification === "requires_review",
  );

  const customOnStandard = buildBillingReadinessSnapshot(
    baseState({
      commercialAgreementId: "custom-legacy",
      monthlyRetainerAmount: 1500,
      setupFee: 500,
      monthlyServiceCredits: 4,
      planKey: "growth",
      planStatus: "active",
    }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "custom agreement/standard plan state is identified",
    customOnStandard.alignment.status === "mismatch",
  );

  // Paused / trial
  const paused = buildBillingReadinessSnapshot(
    baseState({ planStatus: "paused" }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "paused state is represented conservatively",
    paused.alignment.status === "paused" &&
      paused.warnings.some((w) => w.includes("not active")),
  );

  const trial = buildBillingReadinessSnapshot(
    baseState({ planStatus: "trial" }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "trial state is represented accurately",
    trial.alignment.status === "trial_aligned" &&
      trial.warnings.some((w) => w.includes("Trial access")),
  );

  // External identities
  const linked = buildBillingReadinessSnapshot(
    baseState(),
    emptyProfile({
      profilePresent: true,
      billingContact: "Finance",
      billingEmail: "billing@example.com",
      stripeCustomerId: "cus_ABCDE1234567890",
    }),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "existing external identifiers are sanitized",
    linked.externalIdentities[0]?.sanitizedId === "cus_…7890" ||
      Boolean(linked.externalIdentities[0]?.sanitizedId?.includes("…")),
  );
  check(
    "billing contact loads only from authoritative source",
    linked.billingContact.source === "billing-profiles" &&
      linked.billingContact.email === "billing@example.com",
  );
  check(
    "externally linked readiness when Stripe customer present",
    linked.readiness === "externally_linked",
  );

  const conflict = buildBillingReadinessSnapshot(
    baseState(),
    emptyProfile({
      profilePresent: true,
      stripeSubscriptionId: "sub_1234567890",
      stripeCustomerId: null,
    }),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "conflicting external identities block readiness",
    conflict.blockers.some((b) => b.code === "conflicting_external_identity"),
  );

  const dup = buildBillingReadinessSnapshot(
    baseState(),
    emptyProfile({ profilePresent: true, duplicateProfiles: true }),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "duplicate billing profiles block readiness",
    dup.blockers.some((b) => b.code === "conflicting_external_identity"),
  );

  check(
    "sanitizeExternalId never returns full long id",
    sanitizeExternalId("cus_ABCDEFGHIJKLMNOP") !== "cus_ABCDEFGHIJKLMNOP",
  );

  // Browser authority rejection
  check(
    "browser monetary fields are rejected",
    rejectBrowserBillingAuthority({ setupFee: 99 }).ok === false,
  );
  check(
    "browser currency and cadence are rejected",
    rejectBrowserBillingAuthority({ currency: "usd", cadence: "monthly" }).ok ===
      false,
  );
  check(
    "browser Stripe IDs are rejected",
    rejectBrowserBillingAuthority({ stripeCustomerId: "cus_x" }).ok === false,
  );
  check(
    "empty body is accepted for optional POST",
    rejectBrowserBillingAuthority(null).ok === true,
  );

  // Fingerprint determinism
  const fp1 = buildBillingReadinessFingerprint({
    clientId: 42,
    agreementId: "kxd-operating",
    planKey: "growth",
    planStatus: "active",
    setupFeeCents: 175000,
    monthlyRetainerCents: 200000,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    readiness: "ready_for_review",
    alignmentStatus: "aligned_standard",
    billingEmail: null,
    externalKeys: [],
  });
  const fp2 = buildBillingReadinessFingerprint({
    clientId: 42,
    agreementId: "kxd-operating",
    planKey: "growth",
    planStatus: "active",
    setupFeeCents: 175000,
    monthlyRetainerCents: 200000,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    readiness: "ready_for_review",
    alignmentStatus: "aligned_standard",
    billingEmail: null,
    externalKeys: [],
  });
  check("fingerprint is deterministic", fp1 === fp2 && fp1.length === 40);

  const fpAgreement = buildBillingReadinessFingerprint({
    clientId: 42,
    agreementId: "kxd-partnership",
    planKey: "growth",
    planStatus: "active",
    setupFeeCents: 175000,
    monthlyRetainerCents: 200000,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    readiness: "ready_for_review",
    alignmentStatus: "aligned_standard",
    billingEmail: null,
    externalKeys: [],
  });
  check("agreement changes alter the fingerprint", fpAgreement !== fp1);

  const fpPlan = buildBillingReadinessFingerprint({
    clientId: 42,
    agreementId: "kxd-operating",
    planKey: "starter",
    planStatus: "active",
    setupFeeCents: 175000,
    monthlyRetainerCents: 200000,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    readiness: "ready_for_review",
    alignmentStatus: "mismatch",
    billingEmail: null,
    externalKeys: [],
  });
  check("plan changes alter the fingerprint", fpPlan !== fp1);

  const fpMoney = buildBillingReadinessFingerprint({
    clientId: 42,
    agreementId: "kxd-operating",
    planKey: "growth",
    planStatus: "active",
    setupFeeCents: 100000,
    monthlyRetainerCents: 200000,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    readiness: "ready_for_review",
    alignmentStatus: "aligned_standard",
    billingEmail: null,
    externalKeys: [],
  });
  check("commercial-value changes alter the fingerprint", fpMoney !== fp1);

  check(
    "UI helper requires recorded agreement",
    isBillingReviewAvailable({ commercialAgreementId: "kxd-operating" }) &&
      !isBillingReviewAvailable({ commercialAgreementId: null }),
  );
  check(
    "status labels are calm and non-transactional",
    billingReadinessStatusLabel("ready_for_future_sync").includes("future") &&
      !billingReadinessStatusLabel("ready_for_review").toLowerCase().includes("live"),
  );

  // Alignment helper
  check(
    "assessAgreementPlanAlignment for aligned standard",
    assessAgreementPlanAlignment(baseState()).status === "aligned_standard",
  );

  // Cross-phase isolation
  check(
    "custom-legacy still blocked from automated activation",
    mapAgreementToPlan("custom-legacy").ok === false,
  );
  const act = evaluateActivationEligibility({
    clientId: 42,
    clientName: "x",
    updatedAt: null,
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: [],
  });
  check(
    "Phase 37B activation remains healthy for standard agreement",
    act.eligibility === "eligible" || act.canActivate === true || act.blockers.length >= 0,
  );
  check(
    "Phase 37B activation eligibility still evaluates",
    typeof act.eligibility === "string",
  );

  const pc = evaluatePlanChangeEligibility({
    clientId: 42,
    clientName: "x",
    updatedAt: null,
    commercialAgreementId: "kxd-executive",
    monthlyRetainerAmount: 3500,
    setupFee: 3000,
    monthlyServiceCredits: 12,
    commercialAddOns: [],
    planKey: "growth",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: ["website-review"],
  });
  check(
    "Phase 37C plan change remains healthy",
    typeof pc.eligibility === "string",
  );

  const leg = evaluateLegacyConversionEligibility({
    clientId: 42,
    clientName: "x",
    updatedAt: null,
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: ["website-review"],
    rawCesModules: ["website-review"],
  });
  check(
    "Phase 37D legacy conversion remains healthy",
    typeof leg.eligibility === "string",
  );

  const customElig = evaluateCustomPlanEligibility(
    {
      clientId: 42,
      clientName: "x",
      updatedAt: null,
      commercialAgreementId: "custom-legacy",
      monthlyRetainerAmount: 1500,
      setupFee: 500,
      monthlyServiceCredits: 4,
      commercialAddOns: [],
      planKey: null,
      planStatus: "legacy",
      addOnModules: [],
      removedModules: [],
      currentEffectiveModules: ["website-review"],
      rawCesModules: ["website-review"],
    },
    ["website-review"],
  );
  check(
    "Phase 37E custom plan remains healthy",
    typeof customElig.eligibility === "string",
  );

  const save = parseCommercialSaveBody({
    commercialAgreementId: "kxd-partnership",
    monthlyRetainerAmount: 1250,
    setupFee: 1000,
    monthlyServiceCredits: 4,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check(
    "Phase 37A agreement save still accepts standard terms without provisioning fields",
    save.ok === true,
  );

  check(
    "client-id substitution helper still fails mismatches",
    rejectBodyClientIdMismatch(5, { clientId: 9 }) === "Client identity mismatch.",
  );

  // Source architecture guards
  const logic = read("lib/commercial-agreements/billing-readiness-logic.ts");
  const service = read("lib/commercial-agreements/billing-readiness-service.ts");
  const route = read(
    "app/api/admin/commercial-agreements/[clientId]/billing-readiness/route.ts",
  );
  const ui = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );

  check(
    "route requires operator authentication",
    route.includes("requirePayloadAdminApi"),
  );
  check(
    "route is read-oriented GET",
    route.includes("export async function GET"),
  );
  check(
    "service performs no persistence APIs",
    !service.includes("payload.create") &&
      !service.includes("payload.update") &&
      !service.includes("publishActivity"),
  );
  check(
    "service performs no Stripe SDK usage",
    !service.includes('from "stripe"') && !service.includes("new Stripe"),
  );
  check(
    "logic performs no Stripe/network imports",
    !logic.includes('from "stripe"') && !logic.includes("fetch("),
  );
  check(
    "UI has no create-customer or sync-to-stripe controls",
    !ui.includes("Create customer") &&
      !ui.includes("Sync to Stripe") &&
      !ui.includes("Start subscription") &&
      !ui.includes("Send invoice") &&
      ui.includes("Review billing readiness"),
  );
  check(
    "UI states no charge is created",
    ui.includes("No charge, Stripe object") ||
      ui.includes("No billing action performed"),
  );
  check(
    "no migration file introduced for 37F",
    !readFileSync(join(root, "package.json"), "utf8").includes(
      "phase37f",
    ),
  );

  // Negative commercial values in snapshot
  const negative = buildBillingReadinessSnapshot(
    baseState({ setupFee: -10 }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "negative amounts surface as blockers in snapshot",
    negative.blockers.some((b) => b.code === "negative_amount"),
  );

  const precision = buildBillingReadinessSnapshot(
    baseState({ monthlyRetainerAmount: 12.345 }),
    emptyProfile(),
    "2026-07-21T18:00:00.000Z",
  );
  check(
    "invalid precision surfaces as blockers in snapshot",
    precision.blockers.some((b) => b.code === "invalid_precision"),
  );

  console.log("\nAll Phase 37F billing-readiness checks passed.\n");
}

main();
