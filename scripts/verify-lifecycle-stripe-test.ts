/**
 * Controlled Stripe TEST MODE — commercial lifecycle verification (no network required).
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/verify-lifecycle-stripe-test.ts
 */
import {
  createFakeCommercialStripeAdapter,
  normalizeStripeLivemodeFlag,
} from "../lib/stripe/commercial-stripe-adapter.ts";
import { resolveCommercialStripeTestCredentials } from "../lib/stripe/commercial-credentials.ts";
import { detectSecretKeyMode } from "../lib/stripe/integration-readiness-logic.ts";
import { isCommercialStripeOperationAllowed } from "../lib/stripe/integration-readiness-logic.ts";
import { STRIPE_TEST_FIXTURES } from "../lib/stripe/integration-readiness-logic.ts";
import {
  assertPlanPayableForStripeTest,
  buildLifecycleInvoiceMetadata,
  deriveLifecycleInvoiceIdempotencyKey,
  emptyLifecycleStripeTestState,
  reconcileInvoiceAgainstPlan,
} from "../lib/proposal-lifecycle/stripe-test/invoice-logic.ts";
import { processLifecycleStripeTestWebhookEvent } from "../lib/proposal-lifecycle/stripe-test/webhook-logic.ts";
import type { ProposedBillingPlan } from "../lib/proposal-lifecycle/types.ts";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("\nLifecycle Stripe TEST MODE verification\n");

check("invoice_create authorized for lifecycle phase", isCommercialStripeOperationAllowed("invoice_create"));
check("subscription_create still closed", !isCommercialStripeOperationAllowed("subscription_create"));
check("live fixture key classified live", detectSecretKeyMode(STRIPE_TEST_FIXTURES.secretLive) === "live");
check("test fixture key classified test", detectSecretKeyMode(STRIPE_TEST_FIXTURES.secretTest) === "test");
check("explicit false livemode is safe", normalizeStripeLivemodeFlag(false) === false);
check("explicit true livemode is unsafe", normalizeStripeLivemodeFlag(true) === true);
check("missing livemode fails closed as unsafe", normalizeStripeLivemodeFlag(undefined) === true);
check("null livemode fails closed as unsafe", normalizeStripeLivemodeFlag(null) === true);

const priorTest = process.env.STRIPE_SECRET_KEY_TEST;
const priorGeneric = process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_SECRET_KEY_TEST;
process.env.STRIPE_SECRET_KEY = STRIPE_TEST_FIXTURES.secretLive;
check("live generic key rejected by resolver", resolveCommercialStripeTestCredentials().ok === false);
process.env.STRIPE_SECRET_KEY = STRIPE_TEST_FIXTURES.secretTest;
check("test generic key accepted by resolver", resolveCommercialStripeTestCredentials().ok === true);
process.env.STRIPE_SECRET_KEY_TEST = STRIPE_TEST_FIXTURES.secretTest;
process.env.STRIPE_SECRET_KEY = STRIPE_TEST_FIXTURES.secretLive;
const prefer = resolveCommercialStripeTestCredentials();
check("dedicated test key preferred over live generic", prefer.ok && prefer.source === "STRIPE_SECRET_KEY_TEST");
if (priorTest === undefined) delete process.env.STRIPE_SECRET_KEY_TEST;
else process.env.STRIPE_SECRET_KEY_TEST = priorTest;
if (priorGeneric === undefined) delete process.env.STRIPE_SECRET_KEY;
else process.env.STRIPE_SECRET_KEY = priorGeneric;

const plan: ProposedBillingPlan = {
  schemaVersion: 1,
  id: "bp_test",
  status: "ready-for-review",
  invoiceReadiness: "ready-for-review",
  contractId: 99,
  proposalId: 88,
  proposalNumber: "KXD-P-TEST",
  contractVersion: 1,
  contractHash: "abc",
  currency: "USD",
  oneTimeTotalCents: 10000,
  monthlyTotalCents: 0,
  obligations: [
    {
      id: "ob_initial",
      kind: "initial",
      label: "Initial",
      amountCents: 10000,
      currency: "USD",
      trigger: "on-execution",
      dueTerms: "upon acceptance",
      status: "pending-trigger",
    },
  ],
  recurring: null,
  issues: [],
  reconciliation: {
    contractOneTimeCents: 10000,
    obligationsSumCents: 10000,
    differenceCents: 0,
    creditsAppliedOnce: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const payable = assertPlanPayableForStripeTest(plan);
check("plan payable", payable.ok === true);

const adapter = createFakeCommercialStripeAdapter();
const account = await adapter.verifyAccount();
check("fake account livemode false", account.livemode === false);

const customer = await adapter.createCustomer({
  name: "Lifecycle QA Org",
  email: "lifecycle-qa@localhost.invalid",
  idempotencyKey: "kxd_lc_cus_test1",
  metadata: { kxd_client_id: "7", kxd_contract_id: "99", kxd_mode: "test" },
});
const customerReplay = await adapter.createCustomer({
  name: "Lifecycle QA Org",
  email: "lifecycle-qa@localhost.invalid",
  idempotencyKey: "kxd_lc_cus_test1",
  metadata: { kxd_client_id: "7", kxd_contract_id: "99", kxd_mode: "test" },
});
check("customer create idempotent", customer.id === customerReplay.id);

const meta = buildLifecycleInvoiceMetadata({
  clientId: 7,
  contractId: 99,
  obligationId: "ob_initial",
  billingPlanId: plan.id,
});
const idem = deriveLifecycleInvoiceIdempotencyKey({
  contractId: 99,
  contractVersion: 1,
  obligationId: "ob_initial",
  amountCents: 10000,
  currency: "USD",
  billingPlanId: plan.id,
});
const invoice = await adapter.createAndFinalizeInvoice({
  customerId: customer.id,
  currency: "USD",
  amountCents: 10000,
  description: "TEST",
  metadata: meta,
  idempotencyKey: idem,
});
const invoiceReplay = await adapter.createAndFinalizeInvoice({
  customerId: customer.id,
  currency: "USD",
  amountCents: 10000,
  description: "TEST",
  metadata: meta,
  idempotencyKey: idem,
});
check("invoice create idempotent", invoice.id === invoiceReplay.id);
check(
  "invoice reconciles",
  reconcileInvoiceAgainstPlan({
    invoice,
    expected: {
      customerId: customer.id,
      amountCents: 10000,
      currency: "USD",
      clientId: 7,
      contractId: 99,
      obligationId: "ob_initial",
    },
  }).ok,
);

const stripeTest = {
  ...emptyLifecycleStripeTestState(),
  customerId: customer.id,
  invoiceId: invoice.id,
  amountCents: 10000,
  currency: "USD",
  obligationId: "ob_initial",
  billingPlanId: plan.id,
};

const paidEvent = {
  id: "evt_test_paid_1",
  type: "invoice.paid",
  livemode: false as const,
  data: {
    object: {
      id: invoice.id,
      customer: customer.id,
      amount_paid: 10000,
      currency: "usd",
      status: "paid",
      metadata: meta,
      payment_intent: "pi_test_1",
    },
  },
};

const paid = processLifecycleStripeTestWebhookEvent({
  event: paidEvent,
  plan,
  stripeTest,
  expectedContractId: 99,
  expectedClientId: 7,
});
check("paid webhook establishes eligibility", Boolean(paid.ok && paid.onboardingEligible));
check("obligation marked paid", paid.plan?.obligations[0]?.status === "paid");

const replay = processLifecycleStripeTestWebhookEvent({
  event: paidEvent,
  plan: paid.plan!,
  stripeTest: paid.stripeTest!,
  expectedContractId: 99,
  expectedClientId: 7,
});
check("paid webhook replay duplicate-safe", Boolean(replay.ok && replay.duplicate));

const liveReject = processLifecycleStripeTestWebhookEvent({
  event: {
    id: "evt_live",
    type: "invoice.paid",
    livemode: true,
    data: paidEvent.data,
  },
  plan,
  stripeTest,
  expectedContractId: 99,
  expectedClientId: 7,
});
check("livemode true webhook rejected", liveReject.ok === false);

const wrongClient = processLifecycleStripeTestWebhookEvent({
  event: {
    ...paidEvent,
    id: "evt_wrong_client",
    data: {
      object: {
        ...paidEvent.data.object,
        metadata: { ...meta, kxd_client_id: "999" },
      },
    },
  },
  plan,
  stripeTest,
  expectedContractId: 99,
  expectedClientId: 7,
});
check("wrong client metadata rejected", wrongClient.ok === false);

const amountMismatch = processLifecycleStripeTestWebhookEvent({
  event: {
    ...paidEvent,
    id: "evt_amt",
    data: { object: { ...paidEvent.data.object, amount_paid: 1 } },
  },
  plan,
  stripeTest,
  expectedContractId: 99,
  expectedClientId: 7,
});
check("amount mismatch rejected", amountMismatch.ok === false);

const failedEvt = processLifecycleStripeTestWebhookEvent({
  event: {
    id: "evt_fail",
    type: "invoice.payment_failed",
    livemode: false,
    data: {
      object: {
        id: invoice.id,
        customer: customer.id,
        status: "open",
        metadata: meta,
      },
    },
  },
  plan,
  stripeTest,
  expectedContractId: 99,
  expectedClientId: 7,
});
check("payment failure does not grant eligibility", failedEvt.onboardingEligible !== true);

const paidThenFail = processLifecycleStripeTestWebhookEvent({
  event: {
    id: "evt_stale_after_paid",
    type: "invoice.payment_failed",
    livemode: false,
    data: {
      object: {
        id: invoice.id,
        customer: customer.id,
        status: "open",
        metadata: meta,
      },
    },
  },
  plan: paid.plan!,
  stripeTest: paid.stripeTest!,
  expectedContractId: 99,
  expectedClientId: 7,
});
check("stale failure after paid ignored", Boolean(paidThenFail.ok && paidThenFail.duplicate));
check(
  "stale failure does not regress paid status",
  paidThenFail.stripeTest?.invoiceStatus === "paid",
);
check(
  "stale failure preserves eligibility source",
  paidThenFail.stripeTest?.eligibilitySource === "stripe-test-payment" &&
    paidThenFail.onboardingEligible === true,
);

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
