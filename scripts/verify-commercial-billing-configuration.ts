/**
 * Phase 37G — Billing configuration verification.
 *
 *   npm run verify:commercial-billing-configuration
 *
 * Pure deterministic checks (no production writes, no Stripe network).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BILLING_CONFIGURATION_NOTICES,
  assessCurrency,
  buildBillingConfigurationFingerprint,
  buildBillingConfigurationPreview,
  buildBillingProfilePersistencePayload,
  buildBillingReadinessSnapshot,
  classifyCommercialAddOn,
  computeChangedFields,
  normalizeBillingEmail,
  normalizeCurrencyCode,
  parseBillingConfigurationApplyBody,
  parseBillingConfigurationPreviewBody,
  validateBillingConfigurationInput,
  type BillingConfigurationEditableInput,
  type BillingConfigurationProfileState,
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
    clientName: "Billing Config Fixture",
    clientSlug: "billing-config-fixture",
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
  overrides: Partial<BillingConfigurationProfileState> = {},
): BillingConfigurationProfileState {
  return {
    profilePresent: false,
    profileId: null,
    profileUpdatedAt: null,
    billingContact: null,
    billingEmail: null,
    invoiceCadence: null,
    paymentTerms: null,
    billingStatus: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    quickbooksCustomerId: null,
    waveCustomerId: null,
    currencyCode: null,
    collectionMethod: null,
    taxPosture: null,
    duplicateProfiles: false,
    ...overrides,
  };
}

function validInput(
  overrides: Partial<BillingConfigurationEditableInput> = {},
): BillingConfigurationEditableInput {
  return {
    currencyCode: "usd",
    billingContact: "Finance Desk",
    billingEmail: "billing@example.com",
    collectionMethod: "send_invoice",
    paymentTerms: "net-30",
    taxPosture: "taxable",
    invoiceCadence: "monthly",
    ...overrides,
  };
}

function main() {
  console.log("\nPhase 37G — verify:commercial-billing-configuration\n");

  // Currency
  check(
    "currency required remains null until configured",
    normalizeCurrencyCode(null).ok === true &&
      (normalizeCurrencyCode(null) as { value: null }).value === null,
  );
  check(
    "currency normalizes USD to usd",
    normalizeCurrencyCode("USD").ok === true &&
      (normalizeCurrencyCode("USD") as { value: string }).value === "usd",
  );
  check(
    "invalid currency rejected",
    normalizeCurrencyCode("xyz").ok === false,
  );
  check(
    "locale-based currency is never inferred",
    assessCurrency(null).authoritative === false &&
      assessCurrency(null).code === null,
  );

  // Contact / email
  check(
    "billing email normalizes and validates",
    normalizeBillingEmail("  Billing@Example.COM ").ok === true &&
      (normalizeBillingEmail("  Billing@Example.COM ") as { value: string })
        .value === "billing@example.com",
  );
  check(
    "invalid billing email rejected",
    normalizeBillingEmail("not-an-email").ok === false,
  );
  check(
    "billing contact not inferred from unrelated fields",
    buildBillingConfigurationPreview(
      baseState(),
      emptyProfile(),
      validInput({ billingContact: null, billingEmail: null }),
    ).current.billingContact === null,
  );

  // Collection / terms / tax
  check(
    "send_invoice requires payment terms",
    validateBillingConfigurationInput(
      validInput({ paymentTerms: null }),
    ).ok === false,
  );
  check(
    "charge_automatically rejects net terms",
    validateBillingConfigurationInput(
      validInput({
        collectionMethod: "charge_automatically",
        paymentTerms: "net-30",
      }),
    ).ok === false,
  );
  check(
    "charge_automatically with null terms is valid",
    validateBillingConfigurationInput(
      validInput({
        collectionMethod: "charge_automatically",
        paymentTerms: null,
      }),
    ).ok === true,
  );
  check(
    "automatic collection does not imply active payment capability",
    buildBillingConfigurationPreview(
      baseState(),
      emptyProfile(),
      validInput({
        collectionMethod: "charge_automatically",
        paymentTerms: null,
      }),
    ).warnings.some((w) => w.includes("does not enable payment")),
  );
  check(
    "tax posture is explicit and conservative",
    validateBillingConfigurationInput(validInput({ taxPosture: "taxable" }))
      .ok === true &&
      validateBillingConfigurationInput(
        validInput({ taxPosture: "made_up" as never }),
      ).ok === false,
  );
  check(
    "tax exemption is never inferred",
    buildBillingReadinessSnapshot(baseState(), emptyProfile()).taxPosture
      .posture === null,
  );

  // Preview creation / revision / duplicates
  const createPreview = buildBillingConfigurationPreview(
    baseState(),
    emptyProfile(),
    validInput(),
    "2026-07-21T20:00:00.000Z",
  );
  check(
    "new profile creation is proposed",
    createPreview.operation === "create" && createPreview.canApply,
  );
  check(
    "preview performs no write markers",
    createPreview.commercialTermsUnchanged &&
      createPreview.planAccessUnchanged &&
      createPreview.stripeUnchanged &&
      createPreview.noInvoiceSubscriptionChargeOrEmail,
  );
  check(
    "commercial amounts remain sourced from agreement fields",
    createPreview.resultingReadiness.setupFee.source === "clients.setupFee" &&
      createPreview.resultingReadiness.monthlyRetainer.source ===
        "clients.monthlyRetainerAmount",
  );
  check(
    "service credits remain nonfinancial",
    createPreview.resultingReadiness.monthlyServiceCredits.kind ===
      "service_capacity",
  );
  check(
    "add-ons are not silently billable",
    classifyCommercialAddOn("inventory-showroom").classification ===
      "requires_review",
  );
  check(
    "unknown add-ons remain unsupported",
    classifyCommercialAddOn("unknown-addon").classification === "unsupported",
  );

  const revisePreview = buildBillingConfigurationPreview(
    baseState(),
    emptyProfile({
      profilePresent: true,
      profileId: 9,
      profileUpdatedAt: "2026-07-21T10:00:00.000Z",
      currencyCode: "usd",
      billingContact: "Old Contact",
      billingEmail: "old@example.com",
      collectionMethod: "send_invoice",
      paymentTerms: "net-15",
      taxPosture: "taxable",
      invoiceCadence: "monthly",
      stripeCustomerId: "cus_ABCDEFGHIJKLMN",
    }),
    validInput({ billingContact: "New Contact" }),
    "2026-07-21T20:00:00.000Z",
  );
  check(
    "existing profile revision is proposed",
    revisePreview.operation === "revise" &&
      revisePreview.changedFields.some((r) => r.field === "billingContact"),
  );
  check(
    "existing external IDs preserved read-only",
    revisePreview.current.stripeCustomerIdPresent &&
      revisePreview.current.sanitizedStripeCustomerId != null &&
      !JSON.stringify(revisePreview.proposed).includes("cus_"),
  );

  const duplicate = buildBillingConfigurationPreview(
    baseState(),
    emptyProfile({ profilePresent: true, duplicateProfiles: true }),
    validInput(),
  );
  check(
    "duplicate/conflicting profile blocker",
    duplicate.canApply === false &&
      duplicate.blockers.some((b) => b.code === "duplicate_profiles"),
  );

  // Eligibility states
  const missingAgreement = buildBillingConfigurationPreview(
    baseState({
      commercialAgreementId: null,
      planKey: null,
      planStatus: "legacy",
    }),
    emptyProfile(),
    validInput(),
  );
  check(
    "missing agreement allows foundational configuration with warning",
    missingAgreement.canApply &&
      missingAgreement.warnings.some((w) => w.includes("No recorded commercial")),
  );
  const unknownAgreement = buildBillingConfigurationPreview(
    baseState({ commercialAgreementId: "not-a-real-agreement" }),
    emptyProfile(),
    validInput(),
  );
  check(
    "unknown agreement blocks financial-readiness completion",
    unknownAgreement.canApply === false &&
      unknownAgreement.blockers.some((b) => b.code === "unknown_agreement"),
  );
  check(
    "legacy state remains distinct",
    missingAgreement.planStatus === "legacy",
  );
  check(
    "paused plan preserved in preview",
    buildBillingConfigurationPreview(
      baseState({ planStatus: "paused" }),
      emptyProfile(),
      validInput(),
    ).warnings.some((w) => w.includes("paused")),
  );
  check(
    "trial plan does not become Stripe trial",
    buildBillingConfigurationPreview(
      baseState({ planStatus: "trial" }),
      emptyProfile(),
      validInput(),
    ).warnings.some((w) => w.includes("Stripe trial")),
  );
  check(
    "missing plan explained separately",
    buildBillingConfigurationPreview(
      baseState({ planKey: null, planStatus: null }),
      emptyProfile(),
      validInput(),
    ).warnings.some((w) => w.includes("No modern plan")),
  );

  // Idempotent / noop
  const noop = buildBillingConfigurationPreview(
    baseState(),
    emptyProfile({
      profilePresent: true,
      profileId: 3,
      currencyCode: "usd",
      billingContact: "Finance Desk",
      billingEmail: "billing@example.com",
      collectionMethod: "send_invoice",
      paymentTerms: "net-30",
      taxPosture: "taxable",
      invoiceCadence: "monthly",
    }),
    validInput(),
  );
  check("identical apply is noop", noop.operation === "noop");
  check(
    "changed-field calculation empty on noop",
    computeChangedFields(noop.current, noop.proposed).length === 0,
  );

  // Fingerprint
  const fp1 = createPreview.previewFingerprint;
  const fp2 = buildBillingConfigurationPreview(
    baseState(),
    emptyProfile(),
    validInput(),
    "2026-07-21T20:00:00.000Z",
  ).previewFingerprint;
  check("preview fingerprint deterministic", fp1 === fp2 && fp1.length === 40);
  const fpChanged = buildBillingConfigurationPreview(
    baseState(),
    emptyProfile(),
    validInput({ billingEmail: "other@example.com" }),
    "2026-07-21T20:00:00.000Z",
  ).previewFingerprint;
  check("relevant configuration change changes fingerprint", fpChanged !== fp1);
  const fpAgreement = buildBillingConfigurationPreview(
    baseState({ commercialAgreementId: "kxd-partnership" }),
    emptyProfile(),
    validInput(),
    "2026-07-21T20:00:00.000Z",
  ).previewFingerprint;
  check("agreement change invalidates stale preview fingerprint", fpAgreement !== fp1);
  const fpPlan = buildBillingConfigurationPreview(
    baseState({ planKey: "starter" }),
    emptyProfile(),
    validInput(),
    "2026-07-21T20:00:00.000Z",
  ).previewFingerprint;
  check("plan change invalidates stale preview fingerprint", fpPlan !== fp1);
  check(
    "buildBillingConfigurationFingerprint sorts add-ons",
    buildBillingConfigurationFingerprint({
      clientId: 1,
      clientUpdatedAt: null,
      profileId: null,
      profileUpdatedAt: null,
      agreementId: null,
      planKey: null,
      planStatus: null,
      setupFee: null,
      monthlyRetainerAmount: null,
      monthlyServiceCredits: null,
      commercialAddOns: ["b", "a"],
      current: validInput(),
      proposed: validInput(),
    }) ===
      buildBillingConfigurationFingerprint({
        clientId: 1,
        clientUpdatedAt: null,
        profileId: null,
        profileUpdatedAt: null,
        agreementId: null,
        planKey: null,
        planStatus: null,
        setupFee: null,
        monthlyRetainerAmount: null,
        monthlyServiceCredits: null,
        commercialAddOns: ["a", "b"],
        current: validInput(),
        proposed: validInput(),
      }),
  );

  // Request parsing / security
  check(
    "preview rejects Stripe IDs and readiness",
    parseBillingConfigurationPreviewBody({
      currencyCode: "usd",
      stripeCustomerId: "cus_x",
    }).ok === false,
  );
  check(
    "browser cannot override agreement/plan/amounts",
    parseBillingConfigurationPreviewBody({
      currencyCode: "usd",
      setupFee: 1,
      planKey: "premium",
      commercialAgreementId: "kxd-executive",
    }).ok === false,
  );
  check(
    "apply requires acknowledgment",
    parseBillingConfigurationApplyBody({
      ...validInput(),
      previewFingerprint: "abc",
      confirmed: true,
    }).ok === false,
  );
  check(
    "apply requires confirmed true",
    parseBillingConfigurationApplyBody({
      ...validInput(),
      previewFingerprint: "abc",
      confirmed: false,
      configurationDoesNotActivateBilling: true,
    }).ok === false,
  );
  const applyOk = parseBillingConfigurationApplyBody({
    ...validInput(),
    previewFingerprint: "abc123",
    confirmed: true,
    configurationDoesNotActivateBilling: true,
  });
  check("valid apply body accepted", applyOk.ok === true);
  check(
    "client-id substitution rejected",
    rejectBodyClientIdMismatch(42, { clientId: 99 }) != null,
  );

  // Persistence payload
  const persist = buildBillingProfilePersistencePayload(validInput());
  check(
    "persistence writes only billing-profile configuration",
    persist.currencyCode === "usd" &&
      persist.billingStatus === "partial" &&
      !("setupFee" in persist) &&
      !("stripeCustomerId" in persist) &&
      !("planKey" in persist),
  );
  check(
    "persistence never marks billing active from configuration alone",
    persist.billingStatus !== "active",
  );

  // Readiness integration
  const ready = buildBillingReadinessSnapshot(
    baseState({ commercialAddOns: [] }),
    {
      profilePresent: true,
      billingContact: "Finance Desk",
      billingEmail: "billing@example.com",
      invoiceCadence: "monthly",
      paymentTerms: "net-30",
      billingStatus: "partial",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      quickbooksCustomerId: null,
      waveCustomerId: null,
      currencyCode: "usd",
      collectionMethod: "send_invoice",
      taxPosture: "taxable",
      duplicateProfiles: false,
    },
  );
  check(
    "Phase 37F readiness recalculates from saved configuration",
    ready.currency.authoritative &&
      ready.collectionMethod.present &&
      ready.taxPosture.present &&
      ready.readiness === "ready_for_future_sync",
  );
  check(
    "notices remain non-activation",
    BILLING_CONFIGURATION_NOTICES.some((n) =>
      n.includes("does not activate billing"),
    ),
  );

  // Route / migration / activity source checks
  const previewRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/billing-configuration-preview/route.ts",
  );
  const applyRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/apply-billing-configuration/route.ts",
  );
  const service = read(
    "lib/commercial-agreements/billing-configuration-service.ts",
  );
  const migration = read(
    "migrations/20260721_phase37g_billing_configuration.ts",
  );
  const collection = read("payload/collections/BillingProfiles.ts");
  const migrationIndex = read("migrations/index.ts");
  const screen = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );

  check(
    "preview/apply require operator auth",
    previewRoute.includes("requirePayloadAdminApi") &&
      applyRoute.includes("requirePayloadAdminApi"),
  );
  check(
    "routes perform no Stripe SDK imports or network calls",
    !previewRoute.includes('from "stripe"') &&
      !previewRoute.includes("lib/stripe") &&
      !applyRoute.includes('from "stripe"') &&
      !applyRoute.includes("lib/stripe") &&
      !service.includes('from "stripe"') &&
      !service.includes("lib/stripe") &&
      !service.includes("stripe.customers") &&
      !service.includes("fetch(\"https://api.stripe"),
  );
  check(
    "service emits accurate configuration activity types only after persistence path",
    service.includes("commercial.billing_configuration.created") &&
      service.includes("commercial.billing_configuration.changed") &&
      service.includes("publishActivity") &&
      !service.includes("billing activated") &&
      !service.includes("subscription created"),
  );
  check(
    "noop path skips persistence rewrite",
    service.includes('preview.operation === "noop"') &&
      service.includes("No changes were made"),
  );
  check(
    "migration is additive only",
    migration.includes("ADD COLUMN IF NOT EXISTS") &&
      !migration.includes("DROP COLUMN IF EXISTS \"billing_email\"") &&
      migration.includes("currency_code") &&
      migration.includes("collection_method") &&
      migration.includes("tax_posture"),
  );
  check(
    "migration registered in index",
    migrationIndex.includes("20260721_phase37g_billing_configuration"),
  );
  check(
    "collection owns new canonical fields",
    collection.includes('name: "currencyCode"') &&
      collection.includes('name: "collectionMethod"') &&
      collection.includes('name: "taxPosture"'),
  );
  check(
    "admin UX distinguishes configuration from Stripe execution",
    screen.includes("Configure billing details") &&
      screen.includes("Configuration does not activate billing") &&
      screen.includes("Stripe unchanged") &&
      !screen.includes("Create Stripe customer") &&
      !screen.includes("Sync to Stripe") &&
      !screen.includes("Charge automatically now"),
  );
  check(
    "no email / invoice / subscription creation language in service",
    !service.includes("sendEmail") &&
      !service.includes("createInvoice") &&
      !service.includes("subscriptions.create"),
  );

  // Custom agreement behavior
  const custom = buildBillingConfigurationPreview(
    baseState({
      commercialAgreementId: "custom-legacy",
      planKey: "custom",
      monthlyRetainerAmount: 3333,
      setupFee: 500,
    }),
    emptyProfile(),
    validInput(),
  );
  check(
    "custom agreement terms remain authoritative in readiness",
    custom.resultingReadiness.monthlyRetainer.amount === 3333,
  );

  console.log("\nPhase 37G billing-configuration verification passed.\n");
}

main();
