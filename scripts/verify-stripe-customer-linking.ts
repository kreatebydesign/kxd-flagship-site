/**
 * Phase 37I — Stripe customer linking & reconciliation verification.
 *
 *   npm run verify:stripe-customer-linking
 *
 * Pure deterministic checks with fake Stripe adapter (no network).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED,
  STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS,
  STRIPE_PHASE_37I_TEST_READS_AUTHORIZED,
  STRIPE_TEST_FIXTURES,
  assessLinkEligibility,
  assessPhase37IStructuralGate,
  buildCustomerCandidate,
  buildLinkPreviewFingerprint,
  computeReconciliationStatus,
  createFakeCommercialStripeAdapter,
  isCommercialStripeOperationAllowed,
  isStripeCustomerIdFormat,
  maskBillingEmail,
  parseConnectivityVerifyBody,
  parseCustomerSearchBody,
  parseLinkApplyBody,
  parseLinkPreviewBody,
  parseReconcileBody,
  parseUnlinkBody,
  refineReconciliationForClientMetadata,
  rejectBrowserStripeLinkAuthority,
} from "../lib/stripe";

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

async function main() {
  console.log("\nPhase 37I — verify:stripe-customer-linking\n");

  // Auth / routes
  const routes = [
    "app/api/admin/commercial-agreements/stripe-connectivity/verify/route.ts",
    "app/api/admin/commercial-agreements/stripe-customers/search/route.ts",
    "app/api/admin/commercial-agreements/stripe-customers/link-preview/route.ts",
    "app/api/admin/commercial-agreements/stripe-customers/link/route.ts",
    "app/api/admin/commercial-agreements/stripe-customers/unlink/route.ts",
    "app/api/admin/commercial-agreements/stripe-customers/reconcile/route.ts",
    "app/api/admin/commercial-agreements/stripe-customers/eligible/route.ts",
  ];
  for (const rel of routes) {
    const src = read(rel);
    check(`${rel} requires operator auth`, src.includes("requirePayloadAdminApi"));
    check(`${rel} sets no-store`, src.includes("no-store"));
  }

  check(
    "unsupported GET rejected on verify",
    read(routes[0]).includes("status: 405"),
  );

  // Policy
  check(
    "Phase 37I test reads authorized flag",
    STRIPE_PHASE_37I_TEST_READS_AUTHORIZED === true,
  );
  check(
    "authorized ops are lookup + reconciliation only",
    STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS.includes("customer_lookup") &&
      STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS.includes("reconciliation_read") &&
      STRIPE_PHASE_37I_AUTHORIZED_OPERATIONS.length === 2,
  );
  check(
    "mutation classes remain closed",
    STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED === false &&
      !isCommercialStripeOperationAllowed("subscription_create") &&
      !isCommercialStripeOperationAllowed("invoice_create") &&
      !isCommercialStripeOperationAllowed("checkout_create") &&
      !isCommercialStripeOperationAllowed("catalog_create"),
  );
  check(
    "Phase 37I reads and Phase 37J create allowed by operation policy",
    isCommercialStripeOperationAllowed("customer_lookup") &&
      isCommercialStripeOperationAllowed("reconciliation_read") &&
      isCommercialStripeOperationAllowed("customer_create"),
  );

  // Structural gate
  check(
    "disabled configuration blocks connectivity",
    assessPhase37IStructuralGate({
      secretKey: null,
      publishableKey: null,
      webhookSecret: null,
    }).allowed === false,
  );
  check(
    "incomplete webhook blocks",
    assessPhase37IStructuralGate({
      secretKey: STRIPE_TEST_FIXTURES.secretTest,
      publishableKey: STRIPE_TEST_FIXTURES.publishableTest,
      webhookSecret: null,
    }).allowed === false,
  );
  check(
    "invalid key format blocks",
    assessPhase37IStructuralGate({
      secretKey: STRIPE_TEST_FIXTURES.invalid,
      publishableKey: null,
      webhookSecret: STRIPE_TEST_FIXTURES.webhook,
    }).allowed === false,
  );
  check(
    "mode mismatch blocks",
    assessPhase37IStructuralGate({
      secretKey: STRIPE_TEST_FIXTURES.secretTest,
      publishableKey: STRIPE_TEST_FIXTURES.publishableLive,
      webhookSecret: STRIPE_TEST_FIXTURES.webhook,
    }).allowed === false,
  );
  check(
    "live secret key blocks Phase 37I",
    assessPhase37IStructuralGate({
      secretKey: STRIPE_TEST_FIXTURES.secretLive,
      publishableKey: STRIPE_TEST_FIXTURES.publishableLive,
      webhookSecret: STRIPE_TEST_FIXTURES.webhook,
    }).outcome === "live_mode_rejected",
  );
  check(
    "test key structurally permits authorized reads",
    assessPhase37IStructuralGate({
      secretKey: STRIPE_TEST_FIXTURES.secretTest,
      publishableKey: STRIPE_TEST_FIXTURES.publishableTest,
      webhookSecret: STRIPE_TEST_FIXTURES.webhook,
    }).allowed === true,
  );

  // Browser authority
  check(
    "browser credentials rejected",
    rejectBrowserStripeLinkAuthority({ secretKey: "x" }).ok === false,
  );
  check(
    "browser account ID rejected",
    rejectBrowserStripeLinkAuthority({ accountId: "acct_x" }).ok === false,
  );
  check(
    "browser mode rejected",
    rejectBrowserStripeLinkAuthority({ mode: "test" }).ok === false,
  );
  check(
    "browser execution rejected",
    rejectBrowserStripeLinkAuthority({ enableExecution: true }).ok === false,
  );
  check(
    "connectivity requires confirmedReadOnly",
    parseConnectivityVerifyBody({}).ok === false &&
      parseConnectivityVerifyBody({ confirmedReadOnly: true }).ok === true,
  );

  // Parsers
  check(
    "exact customer lookup format",
    isStripeCustomerIdFormat("cus_ABC123") &&
      !isStripeCustomerIdFormat("not-a-customer"),
  );
  check(
    "search requires client + term or id",
    parseCustomerSearchBody({ clientId: 1 }).ok === false &&
      parseCustomerSearchBody({
        clientId: 1,
        exactCustomerId: "cus_ABC123",
      }).ok === true,
  );
  check(
    "link apply requires confirmations + fingerprint",
    parseLinkApplyBody({
      clientId: 1,
      billingProfileId: 2,
      stripeCustomerId: "cus_ABC123",
      previewFingerprint: "abc",
      confirmed: true,
      linkingDoesNotActivateBilling: true,
    }).ok === true &&
      parseLinkApplyBody({
        clientId: 1,
        billingProfileId: 2,
        stripeCustomerId: "cus_ABC123",
        previewFingerprint: "abc",
        confirmed: false,
        linkingDoesNotActivateBilling: true,
      }).ok === false,
  );
  check(
    "link preview parser",
    parseLinkPreviewBody({
      clientId: 1,
      stripeCustomerId: "cus_ABC123",
    }).ok === true,
  );
  check(
    "reconcile parser",
    parseReconcileBody({ clientId: 1 }).ok === true,
  );
  check(
    "unlink parser requires acks",
    parseUnlinkBody({
      clientId: 1,
      billingProfileId: 2,
      previewFingerprint: "fp",
      confirmed: true,
      unlinkDoesNotAffectAccess: true,
    }).ok === true,
  );

  // Sanitization
  check(
    "email masking",
    maskBillingEmail("billing@example.com") === "bi***@example.com",
  );

  const healthyCustomer = {
    id: "cus_phase37i_fixture",
    name: "Fixture Co",
    email: "billing@example.com",
    deleted: false,
    livemode: false,
    created: 1_700_000_000,
    metadata: { kxd_client_id: "42" },
  };

  const candidate = buildCustomerCandidate({
    customer: healthyCustomer,
    targetClientId: 42,
    linkedClientId: null,
    billingEmail: "billing@example.com",
    clientName: "Fixture Co",
  });
  check("eligible candidate when metadata matches", candidate.eligibleToLink);
  check(
    "email/name notes are informational",
    candidate.emailNameNotes.length >= 1,
  );

  const deleted = buildCustomerCandidate({
    customer: { ...healthyCustomer, deleted: true },
    targetClientId: 42,
    linkedClientId: null,
  });
  check("deleted customer blocked", !deleted.eligibleToLink);

  const conflictMeta = buildCustomerCandidate({
    customer: {
      ...healthyCustomer,
      metadata: { kxd_client_id: "99" },
    },
    targetClientId: 42,
    linkedClientId: null,
  });
  check("conflicting metadata blocks", !conflictMeta.eligibleToLink);

  const elsewhere = buildCustomerCandidate({
    customer: healthyCustomer,
    targetClientId: 42,
    linkedClientId: 7,
  });
  check("cross-client mapping blocked", !elsewhere.eligibleToLink);

  // Link eligibility / fingerprint
  const preview = assessLinkEligibility({
    clientId: 42,
    clientName: "Fixture Co",
    billingProfileId: 9,
    profileCount: 1,
    customer: healthyCustomer,
    accountId: "acct_phase37i_test_fixture",
    accountLivemode: false,
    linkedClientId: null,
    currentMappedCustomerId: null,
    billingEmail: "billing@example.com",
    acknowledgeMissingMetadata: false,
    profileUpdatedAt: "2026-07-21T00:00:00.000Z",
  });
  check("healthy link preview canLink", preview.canLink);
  check("preview fingerprint deterministic", preview.previewFingerprint.length === 40);

  const fp2 = buildLinkPreviewFingerprint({
    clientId: 42,
    billingProfileId: 9,
    stripeCustomerId: healthyCustomer.id,
    accountId: "acct_phase37i_test_fixture",
    mode: "test",
    mappingStatus: "unlinked",
    metadataClientId: "42",
    profileUpdatedAt: "2026-07-21T00:00:00.000Z",
  });
  check("fingerprint stable", fp2 === preview.previewFingerprint);

  const missingMeta = assessLinkEligibility({
    clientId: 42,
    clientName: "Fixture Co",
    billingProfileId: 9,
    profileCount: 1,
    customer: { ...healthyCustomer, metadata: {} },
    accountId: "acct_phase37i_test_fixture",
    accountLivemode: false,
    linkedClientId: null,
    currentMappedCustomerId: null,
    billingEmail: null,
    acknowledgeMissingMetadata: false,
    profileUpdatedAt: null,
  });
  check(
    "missing metadata does not silently prove ownership",
    !missingMeta.canLink && missingMeta.requiresMissingMetadataAck,
  );
  const missingAcked = assessLinkEligibility({
    ...{
      clientId: 42,
      clientName: "Fixture Co",
      billingProfileId: 9,
      profileCount: 1,
      customer: { ...healthyCustomer, metadata: {} },
      accountId: "acct_phase37i_test_fixture",
      accountLivemode: false,
      linkedClientId: null,
      currentMappedCustomerId: null,
      billingEmail: null,
      profileUpdatedAt: null,
    },
    acknowledgeMissingMetadata: true,
  });
  check("missing metadata linkable with explicit ack", missingAcked.canLink);

  check(
    "no profile blocks linking",
    !assessLinkEligibility({
      clientId: 42,
      clientName: "X",
      billingProfileId: 0,
      profileCount: 0,
      customer: healthyCustomer,
      accountId: "acct_x",
      accountLivemode: false,
      linkedClientId: null,
      currentMappedCustomerId: null,
      billingEmail: null,
      acknowledgeMissingMetadata: true,
      profileUpdatedAt: null,
    }).canLink,
  );

  check(
    "duplicate profiles block",
    !assessLinkEligibility({
      clientId: 42,
      clientName: "X",
      billingProfileId: 1,
      profileCount: 2,
      customer: healthyCustomer,
      accountId: "acct_x",
      accountLivemode: false,
      linkedClientId: null,
      currentMappedCustomerId: null,
      billingEmail: null,
      acknowledgeMissingMetadata: true,
      profileUpdatedAt: null,
    }).canLink,
  );

  // Reconciliation pure
  check(
    "reconciliation detects unlinked",
    computeReconciliationStatus({
      hasProfile: true,
      profileCount: 1,
      stripeCustomerId: null,
      stripeMode: null,
      stripeAccountId: null,
      expectedMode: "test",
      expectedAccountId: "acct_x",
      customer: null,
      customerLookupFailed: false,
      configurationBlocked: false,
      duplicateCustomerMappings: 0,
    }).status === "unlinked",
  );
  check(
    "reconciliation detects missing customer",
    computeReconciliationStatus({
      hasProfile: true,
      profileCount: 1,
      stripeCustomerId: "cus_x",
      stripeMode: "test",
      stripeAccountId: "acct_x",
      expectedMode: "test",
      expectedAccountId: "acct_x",
      customer: null,
      customerLookupFailed: false,
      configurationBlocked: false,
      duplicateCustomerMappings: 1,
    }).status === "customer_missing",
  );
  check(
    "reconciliation detects deleted",
    computeReconciliationStatus({
      hasProfile: true,
      profileCount: 1,
      stripeCustomerId: "cus_x",
      stripeMode: "test",
      stripeAccountId: "acct_x",
      expectedMode: "test",
      expectedAccountId: "acct_x",
      customer: { ...healthyCustomer, deleted: true },
      customerLookupFailed: false,
      configurationBlocked: false,
      duplicateCustomerMappings: 1,
    }).status === "customer_deleted",
  );
  check(
    "reconciliation detects account mismatch",
    computeReconciliationStatus({
      hasProfile: true,
      profileCount: 1,
      stripeCustomerId: "cus_x",
      stripeMode: "test",
      stripeAccountId: "acct_other",
      expectedMode: "test",
      expectedAccountId: "acct_x",
      customer: healthyCustomer,
      customerLookupFailed: false,
      configurationBlocked: false,
      duplicateCustomerMappings: 1,
    }).status === "account_mismatch",
  );
  check(
    "reconciliation detects mode mismatch",
    computeReconciliationStatus({
      hasProfile: true,
      profileCount: 1,
      stripeCustomerId: "cus_x",
      stripeMode: "live",
      stripeAccountId: "acct_x",
      expectedMode: "test",
      expectedAccountId: "acct_x",
      customer: healthyCustomer,
      customerLookupFailed: false,
      configurationBlocked: false,
      duplicateCustomerMappings: 1,
    }).status === "mode_mismatch",
  );
  check(
    "reconciliation detects duplicate mapping",
    computeReconciliationStatus({
      hasProfile: true,
      profileCount: 1,
      stripeCustomerId: "cus_x",
      stripeMode: "test",
      stripeAccountId: "acct_x",
      expectedMode: "test",
      expectedAccountId: "acct_x",
      customer: healthyCustomer,
      customerLookupFailed: false,
      configurationBlocked: false,
      duplicateCustomerMappings: 2,
    }).status === "duplicate_internal_mapping",
  );

  const metaMismatch = refineReconciliationForClientMetadata(
    "linked_healthy",
    "consistent",
    "99",
    42,
  );
  check(
    "reconciliation detects metadata mismatch",
    metaMismatch.status === "client_metadata_mismatch",
  );

  // Fake adapter — no network
  const fake = createFakeCommercialStripeAdapter({
    customers: [healthyCustomer],
  });
  const acct = await fake.verifyAccount();
  check("fake adapter returns test account", acct.livemode === false);
  const found = await fake.retrieveCustomer("cus_phase37i_fixture");
  check("fake retrieve works", found?.id === "cus_phase37i_fixture");
  const none = await fake.retrieveCustomer("cus_missing");
  check("fake missing returns null", none === null);
  const byEmail = await fake.listCustomersByEmail("billing@example.com", 5);
  check("fake email search bounded", byEmail.length === 1);
  const multi = createFakeCommercialStripeAdapter({
    customers: [
      healthyCustomer,
      { ...healthyCustomer, id: "cus_other", name: "Other" },
    ],
  });
  const multiHits = await multi.listCustomersByEmail("billing@example.com", 5);
  check(
    "multiple email matches do not auto-select (caller responsibility)",
    multiHits.length === 2,
  );

  // Source guards
  const service = read("lib/stripe/customer-linking-service.ts");
  check(
    "linking service never creates customers",
    !service.includes("customers.create") &&
      !service.includes("createCustomer"),
  );
  check(
    "service has no customers.update",
    !service.includes("customers.update"),
  );
  check(
    "service has no subscription/invoice/checkout mutations",
    !service.includes("subscriptions.create") &&
      !service.includes("invoices.create") &&
      !service.includes("checkout.sessions"),
  );
  check(
    "adapter retains account/customer reads",
    read("lib/stripe/commercial-stripe-adapter.ts").includes("accounts.retrieve") &&
      read("lib/stripe/commercial-stripe-adapter.ts").includes(
        "customers.retrieve",
      ),
  );

  const ui = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );
  check(
    "UI has verify connectivity button language",
    ui.includes("Verify test-mode connectivity") ||
      ui.includes("stripe-connectivity/verify"),
  );
  check(
    "UI has no create-customer control",
    !ui.includes("Create customer") && !ui.includes("Enable live billing"),
  );
  check(
    "connectivity not on page load (no auto verify in useEffect for stripe)",
    !ui.match(/useEffect\([^)]*stripe-connectivity/),
  );

  const migration = read(
    "migrations/20260721_phase37i_stripe_customer_mapping.ts",
  );
  check(
    "migration is additive nullable",
    migration.includes("ADD COLUMN IF NOT EXISTS") &&
      migration.includes("stripe_mode"),
  );
  check(
    "migration registered",
    read("migrations/index.ts").includes(
      "20260721_phase37i_stripe_customer_mapping",
    ),
  );

  const profiles = read("payload/collections/BillingProfiles.ts");
  check(
    "CMS Stripe ID injection prohibited",
    profiles.includes("update: () => false") &&
      profiles.includes("stripeCustomerId"),
  );

  const payments = read("lib/sales/payments.ts");
  const webhook = read("app/api/stripe/webhook/route.ts");
  const mrr = read("lib/live-integrations/stripe.ts");
  check(
    "proposal checkout path still present",
    payments.includes("checkout.sessions.create"),
  );
  check(
    "webhook still verifies signature + raw body",
    webhook.includes("constructEvent") && webhook.includes("req.text()"),
  );
  check(
    "MRR path still isolated",
    mrr.includes("subscriptions.list") && mrr.includes("new Stripe"),
  );

  check(
    "commercial client rejects readiness init",
    read("lib/stripe/commercial-client.ts").includes(
      "readiness_must_not_init_client",
    ),
  );

  console.log("\nPhase 37I Stripe customer linking verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
