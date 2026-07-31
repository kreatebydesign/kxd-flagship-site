/**
 * Server services: commercial lifecycle Stripe TEST MODE customer + invoice.
 * Payment confirmation requires verified webhook (or injected adapter tests).
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getCommercialStripeAdapter } from "../../stripe/commercial-client";
import type { CommercialStripeAdapter } from "../../stripe/commercial-stripe-adapter";
import { KXD_STRIPE_CLIENT_METADATA_KEY } from "../../stripe/customer-linking-types";
import { LIFECYCLE_STRIPE_METADATA } from "../../stripe/lifecycle-test-billing-auth";
import { appendAudit, normalizeLifecyclePackage } from "../package";
import type { ContractLifecyclePackage } from "../types";
import {
  assertPlanPayableForStripeTest,
  buildLifecycleInvoiceMetadata,
  deriveLifecycleCustomerIdempotencyKey,
  deriveLifecycleInvoiceIdempotencyKey,
  emptyLifecycleStripeTestState,
  reconcileInvoiceAgainstPlan,
  type LifecycleStripeTestState,
} from "./invoice-logic";
import {
  processLifecycleStripeTestWebhookEvent,
  type LifecycleStripeWebhookEvent,
} from "./webhook-logic";

const CONTRACTS = "contracts";

function asId(ref: unknown): number | null {
  if (typeof ref === "number") return ref;
  if (ref && typeof ref === "object" && "id" in ref) return Number((ref as { id: number }).id);
  return null;
}

async function loadContract(contractId: number) {
  const payload = await getPayload({ config });
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: contractId,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  return { payload, contract, pkg: normalizeLifecyclePackage(contract.lifecyclePackage) };
}

async function savePkg(
  payload: Awaited<ReturnType<typeof getPayload>>,
  contractId: number,
  pkg: ContractLifecyclePackage,
) {
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: { lifecyclePackage: pkg } as never,
    overrideAccess: true,
  });
}

function getStripeTest(pkg: ContractLifecyclePackage): LifecycleStripeTestState {
  const raw = (pkg as { stripeTest?: LifecycleStripeTestState }).stripeTest;
  return raw ? { ...emptyLifecycleStripeTestState(), ...raw, livemode: false, mode: "test" } : emptyLifecycleStripeTestState();
}

function withStripeTest(
  pkg: ContractLifecyclePackage,
  stripeTest: LifecycleStripeTestState,
): ContractLifecyclePackage {
  return { ...pkg, stripeTest } as ContractLifecyclePackage;
}

export async function ensureLifecycleStripeTestCustomer(input: {
  contractId: number;
  actor: string;
  confirmed: boolean;
  adapter?: CommercialStripeAdapter;
}): Promise<{
  pkg: ContractLifecyclePackage;
  customerId: string;
  reused: boolean;
  accountId: string;
}> {
  if (!input.confirmed) {
    throw new Error("Explicit confirmation is required to create a Stripe test customer.");
  }
  const { payload, contract, pkg } = await loadContract(input.contractId);
  if (String(contract.status) !== "executed") {
    throw new Error("Contract must be fully executed before Stripe test customer creation.");
  }
  const plan = pkg.billingPlan;
  if (!plan) throw new Error("Billing plan required.");
  const payable = assertPlanPayableForStripeTest(plan);
  if (!payable.ok && !pkg.onboardingEligible) {
    // Allow customer prep even when already blocked only if we have identity — still check recon
    if (plan.reconciliation.differenceCents !== 0) {
      throw new Error(payable.message);
    }
  }

  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Contract client is required.");
  const billingEmail =
    pkg.clientBillingIdentity?.billingEmail?.trim().toLowerCase() ||
    "";
  if (!billingEmail || !billingEmail.includes("@")) {
    throw new Error("Reviewed client billing email is required before Stripe test customer creation.");
  }
  const displayName =
    pkg.clientBillingIdentity?.legalName?.trim() ||
    `Lifecycle Test Client ${clientId}`;

  let stripeTest = getStripeTest(pkg);
  const adapter =
    input.adapter ?? getCommercialStripeAdapter("customer_create");

  const account = await adapter.verifyAccount();
  if (account.livemode !== false) {
    throw new Error("Stripe account reported livemode=true — aborting.");
  }

  if (stripeTest.customerId) {
    const existing = await adapter.retrieveCustomer(stripeTest.customerId);
    if (existing && !existing.deleted && existing.livemode === false) {
      const metaClient = existing.metadata[KXD_STRIPE_CLIENT_METADATA_KEY];
      if (metaClient && metaClient !== String(clientId)) {
        throw new Error("Stored Stripe test customer belongs to another client.");
      }
      stripeTest = {
        ...stripeTest,
        accountId: account.accountId,
        customerId: existing.id,
        lastError: null,
      };
      let next = withStripeTest(pkg, stripeTest);
      next = appendAudit(next, {
        actor: input.actor,
        action: "stripe-test.customer-reused",
        reason: existing.id,
      });
      await savePkg(payload, input.contractId, next);
      return {
        pkg: next,
        customerId: existing.id,
        reused: true,
        accountId: account.accountId,
      };
    }
  }

  // Recover by metadata search before create
  const found = await adapter.searchCustomersByClientMetadata(clientId, 5);
  const contractMetaMatches = found.filter(
    (c) =>
      !c.deleted &&
      c.livemode === false &&
      c.metadata[LIFECYCLE_STRIPE_METADATA.contractId] === String(input.contractId),
  );
  if (contractMetaMatches.length > 1) {
    throw new Error("Ambiguous Stripe test customers for this contract — fail closed.");
  }
  if (contractMetaMatches.length === 1) {
    const match = contractMetaMatches[0]!;
    stripeTest = {
      ...stripeTest,
      accountId: account.accountId,
      customerId: match.id,
      lastError: null,
    };
    let next = withStripeTest(pkg, stripeTest);
    next = appendAudit(next, {
      actor: input.actor,
      action: "stripe-test.customer-recovered",
      reason: match.id,
    });
    await savePkg(payload, input.contractId, next);
    return {
      pkg: next,
      customerId: match.id,
      reused: true,
      accountId: account.accountId,
    };
  }

  const idempotencyKey = deriveLifecycleCustomerIdempotencyKey({
    contractId: input.contractId,
    clientId,
    billingEmail,
  });
  const created = await adapter.createCustomer({
    name: displayName.slice(0, 120),
    email: billingEmail,
    idempotencyKey,
    metadata: {
      [KXD_STRIPE_CLIENT_METADATA_KEY]: String(clientId),
      [LIFECYCLE_STRIPE_METADATA.contractId]: String(input.contractId),
      [LIFECYCLE_STRIPE_METADATA.mode]: "test",
      [LIFECYCLE_STRIPE_METADATA.purpose]: "commercial_lifecycle_test_customer",
    },
  });
  if (created.livemode !== false) {
    throw new Error("Created Stripe customer reported livemode=true — aborting.");
  }

  stripeTest = {
    ...stripeTest,
    accountId: account.accountId,
    customerId: created.id,
    lastError: null,
  };
  let next = withStripeTest(pkg, stripeTest);
  next = appendAudit(next, {
    actor: input.actor,
    action: "stripe-test.customer-created",
    reason: created.id,
  });
  await savePkg(payload, input.contractId, next);
  return {
    pkg: next,
    customerId: created.id,
    reused: false,
    accountId: account.accountId,
  };
}

export async function prepareLifecycleStripeTestInvoice(input: {
  contractId: number;
  actor: string;
  confirmed: boolean;
  adapter?: CommercialStripeAdapter;
}): Promise<{
  pkg: ContractLifecyclePackage;
  invoiceId: string;
  hostedInvoiceUrl: string | null;
  amountCents: number;
  currency: string;
}> {
  if (!input.confirmed) {
    throw new Error("Explicit confirmation is required to prepare a Stripe test invoice.");
  }
  const { payload, contract, pkg } = await loadContract(input.contractId);
  if (String(contract.status) !== "executed") {
    throw new Error("Contract must be executed before Stripe test invoice preparation.");
  }
  if (["voided", "superseded"].includes(String(contract.status))) {
    throw new Error("Contract is not payable.");
  }
  const plan = pkg.billingPlan;
  if (!plan) throw new Error("Billing plan required.");
  const payable = assertPlanPayableForStripeTest(plan);
  if (!payable.ok) throw new Error(payable.message);

  let stripeTest = getStripeTest(pkg);
  if (!stripeTest.customerId) {
    throw new Error("Create a Stripe test customer before preparing the invoice.");
  }
  if (stripeTest.invoiceId && stripeTest.invoiceStatus === "paid") {
    throw new Error("Stripe test invoice is already paid.");
  }

  // Idempotent: if open invoice already prepared for same obligation/amount, return it
  if (
    stripeTest.invoiceId &&
    stripeTest.obligationId === payable.obligationId &&
    stripeTest.amountCents === payable.amountCents
  ) {
    return {
      pkg,
      invoiceId: stripeTest.invoiceId,
      hostedInvoiceUrl: stripeTest.hostedInvoiceUrl,
      amountCents: payable.amountCents,
      currency: payable.currency,
    };
  }

  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Contract client is required.");

  const adapter = input.adapter ?? getCommercialStripeAdapter("invoice_create");
  const account = await adapter.verifyAccount();
  if (account.livemode !== false) {
    throw new Error("Stripe account reported livemode=true — aborting.");
  }

  const customer = await adapter.retrieveCustomer(stripeTest.customerId);
  if (!customer || customer.deleted || customer.livemode !== false) {
    throw new Error("Stripe test customer is missing, deleted, or not test-mode.");
  }

  const idempotencyKey = deriveLifecycleInvoiceIdempotencyKey({
    contractId: input.contractId,
    contractVersion: plan.contractVersion,
    obligationId: payable.obligationId,
    amountCents: payable.amountCents,
    currency: payable.currency,
    billingPlanId: plan.id,
  });

  const metadata = buildLifecycleInvoiceMetadata({
    clientId,
    contractId: input.contractId,
    obligationId: payable.obligationId,
    billingPlanId: plan.id,
  });

  const invoice = await adapter.createAndFinalizeInvoice({
    customerId: stripeTest.customerId,
    currency: payable.currency,
    amountCents: payable.amountCents,
    description: `KXD commercial lifecycle TEST invoice — contract ${input.contractId}`,
    metadata,
    idempotencyKey,
    automaticTaxEnabled: false,
  });

  const recon = reconcileInvoiceAgainstPlan({
    invoice,
    expected: {
      customerId: stripeTest.customerId,
      amountCents: payable.amountCents,
      currency: payable.currency,
      clientId,
      contractId: input.contractId,
      obligationId: payable.obligationId,
    },
  });
  if (!recon.ok) throw new Error(recon.message);

  stripeTest = {
    ...stripeTest,
    accountId: account.accountId,
    invoiceId: invoice.id,
    invoiceStatus: invoice.status,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    paymentIntentId: invoice.paymentIntentId,
    amountCents: payable.amountCents,
    currency: payable.currency,
    obligationId: payable.obligationId,
    billingPlanId: plan.id,
    preparedAt: new Date().toISOString(),
    lastError: null,
  };

  // Attach Stripe draft id onto obligation for operator visibility (test IDs only)
  const nextPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
    obligations: plan.obligations.map((o) =>
      o.id === payable.obligationId
        ? { ...o, stripeDraftInvoiceId: invoice.id }
        : o,
    ),
  };

  let next = withStripeTest({ ...pkg, billingPlan: nextPlan }, stripeTest);
  next = appendAudit(next, {
    actor: input.actor,
    action: "stripe-test.invoice-prepared",
    reason: invoice.id,
  });
  await savePkg(payload, input.contractId, next);
  return {
    pkg: next,
    invoiceId: invoice.id,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    amountCents: payable.amountCents,
    currency: payable.currency,
  };
}

export async function processLifecycleStripeTestWebhook(input: {
  contractId: number;
  event: LifecycleStripeWebhookEvent;
  adapter?: CommercialStripeAdapter;
}): Promise<{
  pkg: ContractLifecyclePackage;
  result: ReturnType<typeof processLifecycleStripeTestWebhookEvent>;
}> {
  const { payload, contract, pkg } = await loadContract(input.contractId);
  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Contract client is required.");
  if (!pkg.billingPlan) throw new Error("Billing plan required.");

  const stripeTest = getStripeTest(pkg);
  const result = processLifecycleStripeTestWebhookEvent({
    event: input.event,
    plan: pkg.billingPlan,
    stripeTest,
    expectedContractId: input.contractId,
    expectedClientId: clientId,
  });

  if (!result.ok || !result.plan || !result.stripeTest) {
    let failed = withStripeTest(pkg, {
      ...stripeTest,
      lastError: result.error ?? "webhook_failed",
    });
    failed = appendAudit(failed, {
      actor: "stripe-webhook",
      action: "stripe-test.webhook-rejected",
      reason: result.error ?? "rejected",
    });
    await savePkg(payload, input.contractId, failed);
    return { pkg: failed, result };
  }

  const becameEligible =
    result.onboardingEligible === true &&
    pkg.stripeTest?.eligibilitySource !== "stripe-test-payment";

  let next = withStripeTest(
    {
      ...pkg,
      billingPlan: result.plan,
      onboardingEligible: result.onboardingEligible
        ? true
        : pkg.onboardingEligible,
      onboardingEligibleAt:
        result.onboardingEligible && !pkg.onboardingEligibleAt
          ? new Date().toISOString()
          : pkg.onboardingEligibleAt,
    },
    result.stripeTest,
  );
  next = appendAudit(next, {
    actor: "stripe-webhook",
    action: result.duplicate
      ? "stripe-test.webhook-duplicate"
      : becameEligible
        ? "stripe-test.payment-verified-eligible"
        : "stripe-test.webhook-processed",
    reason: input.event.id,
  });
  await savePkg(payload, input.contractId, next);
  return { pkg: next, result };
}

/** Resolve contract id from verified Stripe event metadata (server-only). */
export function contractIdFromLifecycleStripeEvent(
  event: LifecycleStripeWebhookEvent,
): number | null {
  const raw = event.data?.object?.metadata?.[LIFECYCLE_STRIPE_METADATA.contractId];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
