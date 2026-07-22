/**
 * Phase 37H — Stripe integration readiness verification.
 *
 *   npm run verify:stripe-integration-readiness
 *
 * Pure deterministic checks (no Stripe network, no production writes).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED,
  STRIPE_TEST_FIXTURES,
  buildStripeIntegrationFingerprint,
  buildStripeIntegrationReadiness,
  deriveCommercialStripeIdempotencyInput,
  detectPublishableKeyMode,
  detectSecretKeyMode,
  getStripeExecutionGate,
  isCommercialStripeOperationAllowed,
  isWebhookSecretFormatValid,
  rejectBrowserStripeAuthority,
  stripeIntegrationStatusLabel,
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

function main() {
  console.log("\nPhase 37H — verify:stripe-integration-readiness\n");

  // Disabled / incomplete
  const disabled = buildStripeIntegrationReadiness({
    secretKey: null,
    publishableKey: null,
    webhookSecret: null,
  });
  check("disabled when secret key absent", disabled.status === "disabled");
  check(
    "secret key presence is yes/no only",
    disabled.secretKeyPresent === false &&
      !JSON.stringify(disabled).includes("sk_"),
  );

  const missingWebhook = buildStripeIntegrationReadiness({
    secretKey: STRIPE_TEST_FIXTURES.secretTest,
    publishableKey: STRIPE_TEST_FIXTURES.publishableTest,
    webhookSecret: null,
  });
  check(
    "missing webhook secret → webhook_incomplete",
    missingWebhook.status === "webhook_incomplete",
  );

  // Formats
  check(
    "test secret-key format detection",
    detectSecretKeyMode(STRIPE_TEST_FIXTURES.secretTest) === "test",
  );
  check(
    "live secret-key format detection",
    detectSecretKeyMode(STRIPE_TEST_FIXTURES.secretLive) === "live",
  );
  check(
    "invalid secret format",
    detectSecretKeyMode(STRIPE_TEST_FIXTURES.invalid) === "unknown",
  );
  check(
    "publishable mode alignment helpers",
    detectPublishableKeyMode(STRIPE_TEST_FIXTURES.publishableTest) === "test" &&
      detectPublishableKeyMode(STRIPE_TEST_FIXTURES.publishableLive) === "live",
  );
  check(
    "webhook secret format",
    isWebhookSecretFormatValid(STRIPE_TEST_FIXTURES.webhook) &&
      !isWebhookSecretFormatValid("bad"),
  );

  const mismatch = buildStripeIntegrationReadiness({
    secretKey: STRIPE_TEST_FIXTURES.secretTest,
    publishableKey: STRIPE_TEST_FIXTURES.publishableLive,
    webhookSecret: STRIPE_TEST_FIXTURES.webhook,
  });
  check("test/live mismatch rejection", mismatch.status === "mode_mismatch");

  const invalid = buildStripeIntegrationReadiness({
    secretKey: STRIPE_TEST_FIXTURES.invalid,
    publishableKey: null,
    webhookSecret: STRIPE_TEST_FIXTURES.webhook,
  });
  check("invalid key-format state", invalid.status === "invalid_format");

  const configuredTest = buildStripeIntegrationReadiness({
    secretKey: STRIPE_TEST_FIXTURES.secretTest,
    publishableKey: STRIPE_TEST_FIXTURES.publishableTest,
    webhookSecret: STRIPE_TEST_FIXTURES.webhook,
  });
  check(
    "configured_test when aligned test keys present",
    configuredTest.status === "configured_test",
  );
  check(
    "configured_live when aligned live keys present",
    buildStripeIntegrationReadiness({
      secretKey: STRIPE_TEST_FIXTURES.secretLive,
      publishableKey: STRIPE_TEST_FIXTURES.publishableLive,
      webhookSecret: STRIPE_TEST_FIXTURES.webhook,
    }).status === "configured_live",
  );

  // Sanitization
  const serialized = JSON.stringify(configuredTest);
  check(
    "no raw key returned",
    !serialized.includes(STRIPE_TEST_FIXTURES.secretTest) &&
      !serialized.includes(STRIPE_TEST_FIXTURES.webhook) &&
      !serialized.includes(STRIPE_TEST_FIXTURES.publishableTest),
  );
  check(
    "no partial key returned",
    !serialized.includes("sk_test_phase") &&
      !serialized.includes("whsec_phase") &&
      !serialized.includes("pk_test_phase"),
  );

  // Execution gate
  check(
    "execution gate remains closed",
    STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED === false &&
      getStripeExecutionGate().commercialBillingAuthorized === false,
  );
  check(
    "browser cannot enable execution",
    rejectBrowserStripeAuthority({ enableExecution: true }).ok === false,
  );
  check(
    "configuration_readiness allowed; mutations blocked",
    isCommercialStripeOperationAllowed("configuration_readiness") &&
      !isCommercialStripeOperationAllowed("customer_create") &&
      !isCommercialStripeOperationAllowed("subscription_create") &&
      !isCommercialStripeOperationAllowed("invoice_create") &&
      !isCommercialStripeOperationAllowed("checkout_create"),
  );

  // Strategies
  check(
    "customer identity uses client ID, not email/name",
    configuredTest.customerIdentity.identitySource.includes("clients.id") &&
      configuredTest.customerIdentity.notIdentity.some((n) =>
        n.toLowerCase().includes("email"),
      ),
  );
  check(
    "test/live customer IDs remain distinct",
    configuredTest.customerIdentity.testLiveSeparation
      .toLowerCase()
      .includes("never be mixed"),
  );
  check(
    "manual Stripe-ID injection remains prohibited",
    configuredTest.customerIdentity.manualEdit
      .toLowerCase()
      .includes("prohibited"),
  );
  check(
    "standard catalog strategy is deterministic",
    configuredTest.catalogStrategy.standardAgreements.includes(
      "Shared canonical",
    ),
  );
  check(
    "custom commercial terms remain server-authoritative",
    configuredTest.catalogStrategy.customAgreements.includes(
      "server-authoritative",
    ),
  );
  check(
    "setup fee remains one-time",
    configuredTest.catalogStrategy.setupFee.toLowerCase().includes("one-time"),
  );
  check(
    "monthly retainer remains recurring intent",
    configuredTest.catalogStrategy.monthlyRetainer
      .toLowerCase()
      .includes("recurring"),
  );
  check(
    "service credits remain nonfinancial",
    configuredTest.catalogStrategy.serviceCredits
      .toLowerCase()
      .includes("never map"),
  );
  check(
    "unreviewed add-ons remain excluded",
    configuredTest.catalogStrategy.commercialAddOns.includes("requires_review"),
  );

  // Idempotency
  const idem1 = deriveCommercialStripeIdempotencyInput({
    mode: "test",
    clientId: 42,
    agreementId: "kxd-operating",
    agreementFingerprint: "abc",
    operation: "customer_create",
    effectivePeriodKey: "2026-07",
    configurationFingerprint: "cfg1",
  });
  const idem2 = deriveCommercialStripeIdempotencyInput({
    mode: "test",
    clientId: 42,
    agreementId: "kxd-operating",
    agreementFingerprint: "abc",
    operation: "customer_create",
    effectivePeriodKey: "2026-07",
    configurationFingerprint: "cfg1",
  });
  check("idempotency helper is deterministic", idem1 === idem2);
  const idemChanged = deriveCommercialStripeIdempotencyInput({
    mode: "test",
    clientId: 42,
    agreementId: "kxd-partnership",
    agreementFingerprint: "xyz",
    operation: "customer_create",
    effectivePeriodKey: "2026-07",
    configurationFingerprint: "cfg1",
  });
  check(
    "relevant agreement change alters future idempotency input",
    idemChanged !== idem1,
  );
  check(
    "no personal data embedded in idempotency output",
    !idem1.includes("@") && !idem1.includes("email"),
  );
  check(
    "idempotency foundation ready",
    configuredTest.idempotency.status === "ready",
  );

  // Webhook / reconciliation
  check(
    "webhook signature verification remains required",
    configuredTest.webhookArchitecture.signatureRequired === true &&
      configuredTest.webhookArchitecture.rawBodyRequired === true,
  );
  check(
    "webhook duplicate-event strategy is defined",
    configuredTest.webhookArchitecture.futureRequirements.some((r) =>
      r.toLowerCase().includes("deduplication"),
    ),
  );
  check(
    "webhook processing gaps reported",
    configuredTest.webhookArchitecture.status === "requires_work" &&
      configuredTest.webhookArchitecture.knownGaps.length > 0,
  );
  check(
    "reconciliation requires work",
    configuredTest.reconciliation.status === "requires_work",
  );

  // Fingerprint
  const fp1 = buildStripeIntegrationFingerprint({
    status: "configured_test",
    secretKeyPresent: true,
    publishableKeyPresent: true,
    webhookSecretPresent: true,
    detectedSecretMode: "test",
    detectedPublishableMode: "test",
    modeAligned: true,
    executionAuthorized: false,
  });
  const fp2 = buildStripeIntegrationFingerprint({
    status: "configured_test",
    secretKeyPresent: true,
    publishableKeyPresent: true,
    webhookSecretPresent: true,
    detectedSecretMode: "test",
    detectedPublishableMode: "test",
    modeAligned: true,
    executionAuthorized: false,
  });
  check("fingerprint deterministic", fp1 === fp2 && fp1.length === 40);
  check(
    "status labels are non-transactional",
    stripeIntegrationStatusLabel("configured_test").includes("Structurally") &&
      !stripeIntegrationStatusLabel("configured_live")
        .toLowerCase()
        .includes("connected"),
  );
  check(
    "notices reject live-billing language",
    configuredTest.notices.every(
      (n) =>
        !n.toLowerCase().includes("billing live") &&
        !n.toLowerCase().includes("payments enabled"),
    ),
  );
  check(
    "connectivity is not_tested and no request performed",
    configuredTest.connectivity === "not_tested" &&
      configuredTest.stripeRequestPerformed === false &&
      configuredTest.stripeClientInitialized === false &&
      configuredTest.stripeObjectsCreated === "none",
  );

  // Source guards
  const route = read(
    "app/api/admin/commercial-agreements/stripe-integration-readiness/route.ts",
  );
  const logic = read("lib/stripe/integration-readiness-logic.ts");
  const service = read("lib/stripe/integration-readiness-service.ts");
  const commercialClient = read("lib/stripe/commercial-client.ts");
  const webhook = read("app/api/stripe/webhook/route.ts");
  const payments = read("lib/sales/payments.ts");
  const liveStripe = read("lib/live-integrations/stripe.ts");
  const screen = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );
  const envExample = read(".env.example");

  check(
    "route requires operator authentication",
    route.includes("requirePayloadAdminApi"),
  );
  check(
    "readiness is platform-level GET",
    route.includes("export async function GET") &&
      !route.includes("[clientId]"),
  );
  check(
    "no environment-edit endpoint",
    route.includes("405") &&
      route.includes("Stripe environment editing") &&
      !route.includes("process.env.STRIPE_SECRET_KEY ="),
  );
  check(
    "no persistence from readiness",
    !service.includes("payload.create") &&
      !service.includes("payload.update") &&
      !service.includes("publishActivity"),
  );
  check(
    "no activity event from readiness",
    !service.includes("publishActivity") && !route.includes("publishActivity"),
  );
  check(
    "logic performs no Stripe SDK import",
    !logic.includes('from "stripe"') && !logic.includes("new Stripe"),
  );
  check(
    "service performs no Stripe SDK import",
    !service.includes('from "stripe"') && !service.includes("new Stripe"),
  );
  check(
    "readiness path never initializes Stripe client",
    commercialClient.includes("readiness_must_not_init_client") &&
      commercialClient.includes("execution_gate_closed"),
  );
  check(
    "no Stripe SDK request in readiness route",
    !route.includes("stripe.") && !route.includes("new Stripe"),
  );
  check(
    "existing webhook still requires signature + raw body",
    webhook.includes("constructEvent") &&
      webhook.includes("req.text()") &&
      webhook.includes("stripe-signature"),
  );
  check(
    "existing proposal checkout path unchanged in structure",
    payments.includes("createProposalCheckoutSession") &&
      payments.includes("checkout.sessions.create"),
  );
  check(
    "existing MRR sync path unchanged in structure",
    liveStripe.includes("subscriptions.list") &&
      liveStripe.includes("syncStripe"),
  );
  check(
    "UI has no connect/test/create Stripe controls",
    screen.includes("Stripe integration readiness") &&
      !screen.includes("Connect Stripe") &&
      !screen.includes("Test connection") &&
      !screen.includes("Create customer") &&
      !screen.includes("Sync customer") &&
      !screen.includes("Enable live billing"),
  );
  check(
    "UI distinguishes structural config from connectivity",
    screen.includes("Connectivity not tested") &&
      screen.includes("Execution disabled"),
  );
  check(
    ".env.example documents names without secret values",
    envExample.includes("STRIPE_SECRET_KEY=") &&
      envExample.includes("Phase 37H") &&
      !envExample.includes("sk_live_") &&
      !envExample.includes("sk_test_"),
  );
  check(
    "no migration introduced for 37H",
    (() => {
      try {
        read("migrations/20260721_phase37h_stripe_integration.ts");
        return false;
      } catch {
        return true;
      }
    })(),
  );

  console.log("\nPhase 37H Stripe integration readiness verification passed.\n");
}

main();
