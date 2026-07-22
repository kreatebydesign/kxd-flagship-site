/**
 * Phase 37J — Stripe test customer creation verification.
 *
 *   npm run verify:stripe-customer-creation
 *
 * Pure deterministic checks with fake Stripe adapter (no network).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED,
  STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST,
  STRIPE_PHASE_37J_TEST_CREATE_AUTHORIZED,
  STRIPE_TEST_FIXTURES,
  assessCreateEligibility,
  assessPhase37JCreateGate,
  buildAllowlistedCreateMetadata,
  buildCreationIntentVersion,
  createFakeCommercialStripeAdapter,
  deriveStripeCustomerCreateIdempotencyKey,
  isCommercialStripeOperationAllowed,
  parseCreateApplyBody,
  parseCreatePreviewBody,
  rejectBrowserStripeCreateAuthority,
  resolveAuthoritativeCustomerIdentity,
  verifyCreatedCustomerOwnership,
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
  console.log("\nPhase 37J — verify:stripe-customer-creation\n");

  const routes = [
    "app/api/admin/commercial-agreements/stripe-customers/create-preview/route.ts",
    "app/api/admin/commercial-agreements/stripe-customers/create/route.ts",
  ];
  for (const rel of routes) {
    const src = read(rel);
    check(`${rel} requires operator auth`, src.includes("requirePayloadAdminApi"));
    check(`${rel} sets no-store`, src.includes("no-store"));
    check(`${rel} rejects GET`, src.includes("status: 405"));
  }

  check(
    "Phase 37J create authorized flag",
    STRIPE_PHASE_37J_TEST_CREATE_AUTHORIZED === true,
  );
  check(
    "customer_create allowed; financial mutations blocked",
    isCommercialStripeOperationAllowed("customer_create") &&
      STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED === false &&
      !isCommercialStripeOperationAllowed("subscription_create") &&
      !isCommercialStripeOperationAllowed("invoice_create") &&
      !isCommercialStripeOperationAllowed("checkout_create") &&
      !isCommercialStripeOperationAllowed("catalog_create"),
  );

  check(
    "live key blocks create gate",
    assessPhase37JCreateGate({
      secretKey: STRIPE_TEST_FIXTURES.secretLive,
      publishableKey: STRIPE_TEST_FIXTURES.publishableLive,
      webhookSecret: STRIPE_TEST_FIXTURES.webhook,
    }).allowed === false,
  );
  check(
    "test key permits create gate",
    assessPhase37JCreateGate({
      secretKey: STRIPE_TEST_FIXTURES.secretTest,
      publishableKey: STRIPE_TEST_FIXTURES.publishableTest,
      webhookSecret: STRIPE_TEST_FIXTURES.webhook,
    }).allowed === true,
  );

  check(
    "browser credentials rejected",
    rejectBrowserStripeCreateAuthority({ secretKey: "x" }).ok === false,
  );
  check(
    "browser name/email rejected",
    rejectBrowserStripeCreateAuthority({ name: "Acme", email: "a@b.com" })
      .ok === false,
  );
  check(
    "browser metadata rejected",
    rejectBrowserStripeCreateAuthority({ metadata: { a: "1" } }).ok === false,
  );
  check(
    "browser idempotency key rejected",
    rejectBrowserStripeCreateAuthority({ idempotencyKey: "k" }).ok === false,
  );
  check(
    "browser account/mode rejected",
    rejectBrowserStripeCreateAuthority({ accountId: "acct_x", mode: "test" })
      .ok === false,
  );

  check(
    "preview parser requires clientId",
    parseCreatePreviewBody({}).ok === false &&
      parseCreatePreviewBody({ clientId: 1 }).ok === true,
  );
  check(
    "apply requires confirmations",
    parseCreateApplyBody({
      clientId: 1,
      billingProfileId: 2,
      previewFingerprint: "fp",
      confirmed: true,
      creatingTestCustomerDoesNotActivateBilling: true,
    }).ok === true &&
      parseCreateApplyBody({
        clientId: 1,
        billingProfileId: 2,
        previewFingerprint: "fp",
        confirmed: false,
        creatingTestCustomerDoesNotActivateBilling: true,
      }).ok === false,
  );

  check(
    "authoritative email from billing profile only",
    resolveAuthoritativeCustomerIdentity({
      clientName: "Acme",
      billingContact: null,
      billingEmail: null,
    }).ok === false,
  );
  check(
    "name from billingContact preferred",
    (() => {
      const r = resolveAuthoritativeCustomerIdentity({
        clientName: "Client Co",
        billingContact: "Billing Desk",
        billingEmail: "billing@example.com",
      });
      return r.ok && r.name === "Billing Desk" && r.email === "billing@example.com";
    })(),
  );
  check(
    "name falls back to client name",
    (() => {
      const r = resolveAuthoritativeCustomerIdentity({
        clientName: "Client Co",
        billingContact: null,
        billingEmail: "billing@example.com",
      });
      return r.ok && r.name === "Client Co";
    })(),
  );

  const meta = buildAllowlistedCreateMetadata({
    clientId: 42,
    billingProfileId: 9,
    creationIntentVersion: "abc",
  });
  check(
    "metadata allowlisted and includes kxd_client_id",
    meta.kxd_client_id === "42" &&
      meta.kxd_billing_profile_id === "9" &&
      meta.kxd_environment === "test" &&
      Object.keys(meta).every((k) =>
        (STRIPE_CUSTOMER_CREATE_METADATA_ALLOWLIST as readonly string[]).includes(
          k,
        ),
      ),
  );

  const intent = buildCreationIntentVersion({
    clientId: 42,
    billingProfileId: 9,
    accountId: "acct_x",
    mode: "test",
    name: "Acme",
    email: "billing@example.com",
    profileUpdatedAt: "2026-07-21T00:00:00.000Z",
  });
  const intent2 = buildCreationIntentVersion({
    clientId: 42,
    billingProfileId: 9,
    accountId: "acct_x",
    mode: "test",
    name: "Acme",
    email: "billing@example.com",
    profileUpdatedAt: "2026-07-21T00:00:00.000Z",
  });
  check("creation intent deterministic", intent === intent2 && intent.length === 24);
  const intentChanged = buildCreationIntentVersion({
    clientId: 42,
    billingProfileId: 9,
    accountId: "acct_x",
    mode: "test",
    name: "Acme",
    email: "other@example.com",
    profileUpdatedAt: "2026-07-21T00:00:00.000Z",
  });
  check("email change alters creation intent", intent !== intentChanged);

  const key1 = deriveStripeCustomerCreateIdempotencyKey({
    clientId: 42,
    billingProfileId: 9,
    accountId: "acct_x",
    mode: "test",
    creationIntentVersion: intent,
  });
  const key2 = deriveStripeCustomerCreateIdempotencyKey({
    clientId: 42,
    billingProfileId: 9,
    accountId: "acct_x",
    mode: "test",
    creationIntentVersion: intent,
  });
  check(
    "idempotency key deterministic and prefixed",
    key1 === key2 && key1.startsWith("kxd37j_"),
  );
  const keyChanged = deriveStripeCustomerCreateIdempotencyKey({
    clientId: 42,
    billingProfileId: 9,
    accountId: "acct_x",
    mode: "test",
    creationIntentVersion: intentChanged,
  });
  check("changed intent changes idempotency key", key1 !== keyChanged);

  const eligible = assessCreateEligibility({
    clientId: 42,
    clientName: "Acme",
    billingProfileId: 9,
    profileCount: 1,
    billingContact: "Billing Desk",
    billingEmail: "billing@example.com",
    currentMappedCustomerId: null,
    accountId: "acct_x",
    accountLivemode: false,
    profileUpdatedAt: null,
    metadataMatches: [],
    informationalMatches: [],
    acknowledgeInformationalDuplicates: false,
  });
  check("healthy create eligibility", eligible.canCreate);

  check(
    "no profile blocks creation",
    !assessCreateEligibility({
      ...{
        clientId: 42,
        clientName: "Acme",
        billingProfileId: 0,
        profileCount: 0,
        billingContact: "Billing Desk",
        billingEmail: "billing@example.com",
        currentMappedCustomerId: null,
        accountId: "acct_x",
        accountLivemode: false,
        profileUpdatedAt: null,
        metadataMatches: [],
        informationalMatches: [],
        acknowledgeInformationalDuplicates: false,
      },
    }).canCreate,
  );

  check(
    "existing mapping blocks creation",
    !assessCreateEligibility({
      clientId: 42,
      clientName: "Acme",
      billingProfileId: 9,
      profileCount: 1,
      billingContact: "Billing Desk",
      billingEmail: "billing@example.com",
      currentMappedCustomerId: "cus_existing",
      accountId: "acct_x",
      accountLivemode: false,
      profileUpdatedAt: null,
      metadataMatches: [],
      informationalMatches: [],
      acknowledgeInformationalDuplicates: false,
    }).canCreate,
  );

  check(
    "existing metadata customer blocks and directs to linking",
    (() => {
      const p = assessCreateEligibility({
        clientId: 42,
        clientName: "Acme",
        billingProfileId: 9,
        profileCount: 1,
        billingContact: "Billing Desk",
        billingEmail: "billing@example.com",
        currentMappedCustomerId: null,
        accountId: "acct_x",
        accountLivemode: false,
        profileUpdatedAt: null,
        metadataMatches: [{ id: "cus_meta" }],
        informationalMatches: [],
        acknowledgeInformationalDuplicates: false,
      });
      return (
        !p.canCreate &&
        p.blockers.some((b) => b.code === "existing_metadata_customer")
      );
    })(),
  );

  check(
    "informational duplicates require ack",
    (() => {
      const blocked = assessCreateEligibility({
        clientId: 42,
        clientName: "Acme",
        billingProfileId: 9,
        profileCount: 1,
        billingContact: "Billing Desk",
        billingEmail: "billing@example.com",
        currentMappedCustomerId: null,
        accountId: "acct_x",
        accountLivemode: false,
        profileUpdatedAt: null,
        metadataMatches: [],
        informationalMatches: [
          { id: "cus_email", name: "Other", email: "billing@example.com" },
        ],
        acknowledgeInformationalDuplicates: false,
      });
      const acked = assessCreateEligibility({
        clientId: 42,
        clientName: "Acme",
        billingProfileId: 9,
        profileCount: 1,
        billingContact: "Billing Desk",
        billingEmail: "billing@example.com",
        currentMappedCustomerId: null,
        accountId: "acct_x",
        accountLivemode: false,
        profileUpdatedAt: null,
        metadataMatches: [],
        informationalMatches: [
          { id: "cus_email", name: "Other", email: "billing@example.com" },
        ],
        acknowledgeInformationalDuplicates: true,
      });
      return !blocked.canCreate && acked.canCreate;
    })(),
  );

  check(
    "ownership verification requires metadata",
    verifyCreatedCustomerOwnership({
      customerId: "cus_ABC123",
      clientId: 42,
      billingProfileId: 9,
      creationIntentVersion: intent,
      livemode: false,
      metadata: buildAllowlistedCreateMetadata({
        clientId: 42,
        billingProfileId: 9,
        creationIntentVersion: intent,
      }),
    }).ok === true &&
      verifyCreatedCustomerOwnership({
        customerId: "cus_ABC123",
        clientId: 42,
        billingProfileId: 9,
        creationIntentVersion: intent,
        livemode: false,
        metadata: {},
      }).ok === false,
  );

  // Fake adapter create + idempotent replay
  const customers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    deleted: boolean;
    livemode: boolean;
    created: number | null;
    metadata: Record<string, string>;
  }> = [];
  const idemMap = new Map<string, string>();
  const fake = createFakeCommercialStripeAdapter({
    customers,
    idempotentCreateMap: idemMap,
  });
  const created = await fake.createCustomer({
    name: "Acme",
    email: "billing@example.com",
    metadata: buildAllowlistedCreateMetadata({
      clientId: 42,
      billingProfileId: 9,
      creationIntentVersion: intent,
    }),
    idempotencyKey: key1,
  });
  const replay = await fake.createCustomer({
    name: "Acme",
    email: "billing@example.com",
    metadata: buildAllowlistedCreateMetadata({
      clientId: 42,
      billingProfileId: 9,
      creationIntentVersion: intent,
    }),
    idempotencyKey: key1,
  });
  check(
    "identical idempotency replay returns same customer",
    created.id === replay.id && customers.length === 1,
  );
  const metaHits = await fake.searchCustomersByClientMetadata(42, 5);
  check("metadata search finds created customer", metaHits.length === 1);

  // Source guards
  const adapter = read("lib/stripe/commercial-stripe-adapter.ts");
  check(
    "adapter creates customers only via customers.create",
    adapter.includes("customers.create") &&
      !adapter.includes("customers.update") &&
      !adapter.includes("customers.del"),
  );
  check(
    "adapter has no subscription/invoice/checkout writes",
    !adapter.includes("subscriptions.create") &&
      !adapter.includes("invoices.create") &&
      !adapter.includes("checkout.sessions"),
  );

  const service = read("lib/stripe/customer-creation-service.ts");
  check(
    "service uses customer_create and idempotency helper",
    service.includes("customer_create") &&
      service.includes("deriveStripeCustomerCreateIdempotencyKey"),
  );
  check(
    "service never updates existing Stripe customers",
    !service.includes("customers.update"),
  );
  check(
    "no migration introduced for 37J",
    (() => {
      try {
        read("migrations/20260721_phase37j_stripe_customer_creation.ts");
        return false;
      } catch {
        return true;
      }
    })(),
  );

  const ui = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );
  check(
    "UI has create test customer workflow",
    ui.includes("Create test customer") &&
      ui.includes("stripe-customers/create-preview") &&
      ui.includes("stripe-customers/create"),
  );
  check(
    "UI has no live/subscription/invoice charge controls",
    !ui.includes("Enable live billing") &&
      !ui.includes("Create product") &&
      !ui.includes("Start subscription") &&
      !ui.includes("Charge client") &&
      !ui.includes("Create live customer") &&
      !ui.includes("Attach payment method"),
  );
  check(
    "creation not auto on page load",
    !ui.match(/useEffect\([^)]*create-preview/),
  );

  check(
    "proposal checkout path still present",
    read("lib/sales/payments.ts").includes("checkout.sessions.create"),
  );
  check(
    "webhook still verifies signature",
    read("app/api/stripe/webhook/route.ts").includes("constructEvent"),
  );

  console.log("\nPhase 37J Stripe test customer creation verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
