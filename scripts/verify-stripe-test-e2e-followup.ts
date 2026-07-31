/**
 * Post-E2E idempotency + adversarial checks against a disposable executed contract.
 *   KXD_SERVER_ONLY_SHIM=1 CONTRACT_ID=N npx tsx --env-file=.env.local \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/verify-stripe-test-e2e-followup.ts
 */
import { ensureLifecycleStripeTestCustomer, prepareLifecycleStripeTestInvoice, processLifecycleStripeTestWebhook } from "../lib/proposal-lifecycle/stripe-test/service.ts";
import { getContractLifecycle } from "../lib/proposal-lifecycle/services.ts";
import { redactStripeId } from "../lib/stripe/commercial-credentials.ts";
import { LIFECYCLE_STRIPE_METADATA } from "../lib/stripe/lifecycle-test-billing-auth.ts";
import { processLifecycleStripeTestWebhookEvent } from "../lib/proposal-lifecycle/stripe-test/webhook-logic.ts";

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

async function main() {
  const contractId = Number(process.env.CONTRACT_ID);
  if (!contractId) throw new Error("CONTRACT_ID required");

  const { contract, pkg: initial } = await getContractLifecycle(contractId);
  const clientId =
    typeof contract.client === "object"
      ? Number((contract.client as { id: number }).id)
      : Number(contract.client);
  const st = initial.stripeTest;
  if (!st?.customerId || !st.invoiceId || !initial.billingPlan) {
    throw new Error("Contract missing stripeTest state from E2E");
  }

  check("already eligible", initial.onboardingEligible === true);
  check("eligibility source stripe-test-payment", st.eligibilitySource === "stripe-test-payment");
  check("invoice paid", st.invoiceStatus === "paid");

  const c1 = await ensureLifecycleStripeTestCustomer({
    contractId,
    actor: "followup",
    confirmed: true,
  });
  const c2 = await ensureLifecycleStripeTestCustomer({
    contractId,
    actor: "followup",
    confirmed: true,
  });
  check("customer reuse same id", c1.customerId === c2.customerId && c1.customerId === st.customerId);
  check("second ensure reused", c2.reused === true);

  let invoiceBlocked = false;
  try {
    await prepareLifecycleStripeTestInvoice({
      contractId,
      actor: "followup",
      confirmed: true,
    });
  } catch (err) {
    invoiceBlocked = /already paid/i.test(err instanceof Error ? err.message : "");
  }
  check("prepare invoice blocked when already paid", invoiceBlocked);

  const eventId = st.processedEventIds[0];
  check("has processed event", Boolean(eventId));

  const meta = {
    [LIFECYCLE_STRIPE_METADATA.clientId]: String(clientId),
    [LIFECYCLE_STRIPE_METADATA.contractId]: String(contractId),
    [LIFECYCLE_STRIPE_METADATA.obligationId]: st.obligationId || "",
    [LIFECYCLE_STRIPE_METADATA.billingPlanId]: st.billingPlanId || "",
    [LIFECYCLE_STRIPE_METADATA.mode]: "test",
    [LIFECYCLE_STRIPE_METADATA.purpose]: "commercial_lifecycle_initial_invoice",
  };

  const replay = await processLifecycleStripeTestWebhook({
    contractId,
    event: {
      id: eventId!,
      type: "invoice.paid",
      livemode: false,
      data: {
        object: {
          id: st.invoiceId,
          customer: st.customerId,
          amount_paid: st.amountCents ?? 0,
          currency: (st.currency || "usd").toLowerCase(),
          status: "paid",
          metadata: meta,
        },
      },
    },
  });
  check("replay duplicate-safe", replay.result.ok === true && replay.result.duplicate === true);
  check(
    "replay does not clear eligibility",
    replay.pkg.onboardingEligible === true &&
      replay.pkg.stripeTest?.eligibilitySource === "stripe-test-payment",
  );

  const { pkg: afterReplay } = await getContractLifecycle(contractId);
  check(
    "processed event count stable on exact replay",
    (afterReplay.stripeTest?.processedEventIds?.length ?? 0) ===
      (st.processedEventIds?.length ?? 0),
  );

  const staleFail = processLifecycleStripeTestWebhookEvent({
    event: {
      id: `evt_stale_fail_${Date.now()}`,
      type: "invoice.payment_failed",
      livemode: false,
      data: {
        object: {
          id: st.invoiceId,
          customer: st.customerId,
          status: "open",
          metadata: meta,
        },
      },
    },
    plan: afterReplay.billingPlan!,
    stripeTest: afterReplay.stripeTest!,
    expectedContractId: contractId,
    expectedClientId: clientId,
  });
  check("stale failure after paid ignored as duplicate", Boolean(staleFail.ok && staleFail.duplicate));
  check(
    "stale failure preserves paid invoice status",
    staleFail.stripeTest?.invoiceStatus === "paid",
  );
  check(
    "stale failure preserves onboarding eligibility flag",
    staleFail.onboardingEligible === true &&
      staleFail.stripeTest?.eligibilitySource === "stripe-test-payment",
  );
  const appliedStale = await processLifecycleStripeTestWebhook({
    contractId,
    event: {
      id: `evt_stale_fail_svc_${Date.now()}`,
      type: "invoice.payment_failed",
      livemode: false,
      data: {
        object: {
          id: st.invoiceId,
          customer: st.customerId,
          status: "open",
          metadata: meta,
        },
      },
    },
  });
  check(
    "success then stale failure preserves eligibility in package",
    appliedStale.pkg.onboardingEligible === true &&
      appliedStale.pkg.stripeTest?.invoiceStatus === "paid",
  );

  // Cross-client metadata
  const cross = processLifecycleStripeTestWebhookEvent({
    event: {
      id: `evt_cross_${Date.now()}`,
      type: "invoice.paid",
      livemode: false,
      data: {
        object: {
          id: st.invoiceId,
          customer: st.customerId,
          amount_paid: st.amountCents ?? 0,
          currency: (st.currency || "usd").toLowerCase(),
          status: "paid",
          metadata: { ...meta, [LIFECYCLE_STRIPE_METADATA.clientId]: "999999" },
        },
      },
    },
    plan: afterReplay.billingPlan!,
    stripeTest: afterReplay.stripeTest!,
    expectedContractId: contractId,
    expectedClientId: clientId,
  });
  check("cross-client metadata rejected", cross.ok === false);

  const forgedInvoice = processLifecycleStripeTestWebhookEvent({
    event: {
      id: `evt_forged_inv_${Date.now()}`,
      type: "invoice.paid",
      livemode: false,
      data: {
        object: {
          id: "in_forged_other",
          customer: st.customerId,
          amount_paid: st.amountCents ?? 0,
          currency: (st.currency || "usd").toLowerCase(),
          status: "paid",
          metadata: meta,
        },
      },
    },
    plan: afterReplay.billingPlan!,
    stripeTest: afterReplay.stripeTest!,
    expectedContractId: contractId,
    expectedClientId: clientId,
  });
  check("forged invoice id rejected", forgedInvoice.ok === false);

  const amountMismatch = processLifecycleStripeTestWebhookEvent({
    event: {
      id: `evt_amt_${Date.now()}`,
      type: "invoice.paid",
      livemode: false,
      data: {
        object: {
          id: st.invoiceId,
          customer: st.customerId,
          amount_paid: 1,
          currency: (st.currency || "usd").toLowerCase(),
          status: "paid",
          metadata: meta,
        },
      },
    },
    plan: afterReplay.billingPlan!,
    stripeTest: afterReplay.stripeTest!,
    expectedContractId: contractId,
    expectedClientId: clientId,
  });
  check("amount mismatch rejected", amountMismatch.ok === false);

  const liveEvt = processLifecycleStripeTestWebhookEvent({
    event: {
      id: `evt_live_${Date.now()}`,
      type: "invoice.paid",
      livemode: true,
      data: {
        object: {
          id: st.invoiceId,
          customer: st.customerId,
          amount_paid: st.amountCents ?? 0,
          currency: (st.currency || "usd").toLowerCase(),
          status: "paid",
          metadata: meta,
        },
      },
    },
    plan: afterReplay.billingPlan!,
    stripeTest: afterReplay.stripeTest!,
    expectedContractId: contractId,
    expectedClientId: clientId,
  });
  check("livemode true rejected", liveEvt.ok === false);

  const missingLive = processLifecycleStripeTestWebhookEvent({
    event: {
      id: `evt_missing_live_${Date.now()}`,
      type: "invoice.paid",
      // @ts-expect-error intentional adversarial
      livemode: undefined,
      data: {
        object: {
          id: st.invoiceId,
          customer: st.customerId,
          amount_paid: st.amountCents ?? 0,
          currency: (st.currency || "usd").toLowerCase(),
          status: "paid",
          metadata: meta,
        },
      },
    },
    plan: afterReplay.billingPlan!,
    stripeTest: afterReplay.stripeTest!,
    expectedContractId: contractId,
    expectedClientId: clientId,
  });
  check("missing livemode rejected", missingLive.ok === false);

  console.log(
    JSON.stringify(
      {
        contractId,
        clientId,
        customerRedacted: redactStripeId(st.customerId),
        invoiceRedacted: redactStripeId(st.invoiceId),
      },
      null,
      2,
    ),
  );
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
