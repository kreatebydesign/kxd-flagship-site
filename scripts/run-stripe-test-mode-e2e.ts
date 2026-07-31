/**
 * Controlled disposable Stripe TEST MODE E2E for commercial lifecycle.
 * NEVER touches Proposal ID 1. Never emails. Never live mode.
 *
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.local \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/run-stripe-test-mode-e2e.ts
 *
 * Optional: STRIPE_E2E_PAY=1 to pay the open test invoice via Stripe test PM
 * `pm_card_visa` after prepare — still requires CLI webhook forwarding for eligibility.
 * Never constructs raw card numbers/CVC; never uses Tokens API card material.
 */
import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { dollarsToCents } from "../lib/proposal-builder/money.ts";
import { emptyProposalDocument, newId } from "../lib/proposal-builder/document.ts";
import { createProposal, acceptProposal } from "../lib/proposal-builder/services.ts";
import {
  applyLocalReviewedKxdInvoiceConfig,
  reviewed,
} from "../lib/proposal-lifecycle/billing-identity.ts";
import {
  ensureLifecycleHydrated,
  getContractLifecycle,
  resolveClientBillingIdentity,
  sendContractForClientSignature,
  signContractAsClient,
  signContractAsOperator,
  simulateLocalProposalSend,
} from "../lib/proposal-lifecycle/services.ts";
import {
  ensureLifecycleStripeTestCustomer,
  prepareLifecycleStripeTestInvoice,
} from "../lib/proposal-lifecycle/stripe-test/service.ts";
import { redactStripeId } from "../lib/stripe/commercial-credentials.ts";
import { getCommercialStripeClient } from "../lib/stripe/commercial-client.ts";

/** Stripe-published test PaymentMethod — no raw PAN/CVC, no Tokens API. */
export const STRIPE_TEST_PAYMENT_METHOD_VISA = "pm_card_visa";

const OUT_DIR = join(process.cwd(), "tmp", "proposal-lifecycle-qa", "stripe-test-e2e");

function assertLocal(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) throw new Error("DATABASE_URL missing");
  if (/neon\.tech|vercel-storage|amazonaws\.com/i.test(uri)) {
    throw new Error("Refusing cloud database");
  }
  const host = new URL(uri).hostname;
  const db = new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(`Bad host: ${host}`);
  if (db !== "kxd_audit_report_review") throw new Error(`Bad db: ${db}`);
}

async function fingerprintProposal1(): Promise<{
  id: number;
  status: string;
  fingerprint: string;
  updated_at: string;
}> {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const p = await c.query(
    `SELECT id, status, proposal_number, updated_at, created_at,
      length(coalesce(title,'')) AS title_len,
      approval_status, payment_status, revoked
     FROM proposals WHERE id = 1`,
  );
  await c.end();
  const row = p.rows[0];
  if (!row) throw new Error("Proposal ID 1 missing — cannot prove isolation");
  const updated = row.updated_at?.toISOString?.() || String(row.updated_at);
  const created = row.created_at?.toISOString?.() || String(row.created_at);
  const fingerprint = createHash("sha256")
    .update(
      [
        row.id,
        row.status,
        row.proposal_number,
        updated,
        created,
        row.approval_status,
        row.payment_status,
        row.revoked,
        row.title_len,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
  return {
    id: Number(row.id),
    status: String(row.status),
    fingerprint,
    updated_at: updated,
  };
}

async function main() {
  assertLocal();
  mkdirSync(OUT_DIR, { recursive: true });

  const suffix = Date.now().toString(36);
  const clientName = `KXD Stripe E2E Test ${suffix}`;
  const contactName = "Test Operator";
  const email = `stripe-e2e-${suffix}@example.com`;
  const actor = "stripe-e2e-script";

  const before = await fingerprintProposal1();
  console.log(
    JSON.stringify({
      phase: "preflight",
      proposal1: before,
      clientName,
      emailDomain: "example.com",
    }),
  );

  const doc = emptyProposalDocument({
    organizations: [{ id: newId("org"), name: clientName }],
    contacts: [
      {
        id: newId("contact"),
        name: contactName,
        email,
        title: "Test Operator",
        phone: "(555) 010-9999",
        isPrimary: true,
      },
    ],
    executive: {
      clientFacingIntro: "Disposable Stripe TEST MODE E2E fixture.",
      executiveSummary: "Synthetic agreement for controlled Stripe test billing.",
      objectives: "Validate customer → invoice → webhook → eligibility without onboarding.",
      recommendedDirection: "TEST MODE only. Not a real client.",
    },
    scopeGroups: [
      {
        id: newId("scope"),
        title: "Stripe E2E Scope",
        overview: "Synthetic scope for disposable test.",
        deliverables: [{ id: newId("d"), title: "Fixture deliverable", sortOrder: 1 }],
        inclusion: "included",
        sortOrder: 1,
      },
    ],
    pricingLines: [
      {
        id: newId("line"),
        title: "Stripe E2E fixture fee",
        cadence: "one-time",
        inclusion: "included",
        quantity: 1,
        unitPriceCents: dollarsToCents(50),
        sortOrder: 1,
      },
    ],
    credits: [],
    paymentSchedule: [
      {
        id: newId("pay"),
        label: "Initial test payment",
        due: "at-acceptance",
        amountCents: dollarsToCents(50),
        sortOrder: 1,
      },
    ],
    depositCents: dollarsToCents(50),
    terms: {
      proposalTerms: "Synthetic TEST MODE terms.",
      paymentAssumptions: "Stripe test cards only.",
      nextSteps: "Execute and pay via Stripe test invoice.",
      closingNote: "Disposable local fixture.",
    },
  });

  const created = await createProposal({
    title: `LOCAL STRIPE E2E — ${suffix}`,
    document: doc,
  });
  const proposalId = Number(created.id);
  if (proposalId === 1) throw new Error("Abort: fixture received Proposal ID 1");

  const send = await simulateLocalProposalSend({
    proposalId,
    recipientName: contactName,
    recipientEmail: email,
    createdBy: actor,
  });
  const token = send.publicUrl.split("/proposal/")[1];
  if (!token) throw new Error("Missing public token");

  const accepted = await acceptProposal(token, {
    name: contactName,
    title: "Test Operator",
    organization: clientName,
    email,
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: contactName,
    correlationId: `stripe-e2e-accept-${suffix}`,
    ipAddress: "127.0.0.1",
    userAgent: "stripe-e2e-script",
  });
  const contractId = accepted.contractId;
  if (!contractId) throw new Error("No contract from acceptance");

  await ensureLifecycleHydrated(contractId);

  applyLocalReviewedKxdInvoiceConfig({
    legalEntity: reviewed("Kreate by Design LLC (local fixture)", actor),
    mailingAddress: reviewed("Local fixture mailing address", actor),
    billingEmail: reviewed("billing@localhost.invalid", actor),
    remittanceInformation: reviewed("Local fixture remittance — not for production", actor),
    invoiceNumberingConfigured: true,
    invoiceNumberingState: "reviewed",
  });

  await resolveClientBillingIdentity(contractId, {
    legalName: clientName,
    billingEmail: email,
    billingAddress: "100 Example Street, Test City, OR 97401",
    taxTreatment: "exclusive",
    actor,
  });

  await signContractAsOperator(contractId, {
    legalName: "Test Operator KXD",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "operator@localhost.invalid",
    typedAcknowledgment: "Test Operator KXD",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actor,
    ipAddress: "127.0.0.1",
    userAgent: "stripe-e2e-script",
  });

  const sent = await sendContractForClientSignature({
    contractId,
    recipientName: contactName,
    recipientEmail: email,
    createdBy: actor,
    forceDespiteBillingBlockers: false,
  });

  const clientSigned = await signContractAsClient(sent.rawToken, {
    name: contactName,
    title: "Test Operator",
    organization: clientName,
    email,
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: contactName,
    electronicRecordsConsent: true,
    ipAddress: "127.0.0.1",
    userAgent: "stripe-e2e-script",
    correlationId: `stripe-e2e-sign-${suffix}`,
  });

  if (String(clientSigned.contract.status) !== "executed") {
    throw new Error(`Expected executed, got ${clientSigned.contract.status}`);
  }

  const customer = await ensureLifecycleStripeTestCustomer({
    contractId,
    actor,
    confirmed: true,
  });
  const customerAgain = await ensureLifecycleStripeTestCustomer({
    contractId,
    actor,
    confirmed: true,
  });
  if (customer.customerId !== customerAgain.customerId) {
    throw new Error("Customer ensure not idempotent");
  }
  if (!customerAgain.reused) {
    throw new Error("Expected customer reuse on second ensure");
  }

  const invoice = await prepareLifecycleStripeTestInvoice({
    contractId,
    actor,
    confirmed: true,
  });
  const invoiceAgain = await prepareLifecycleStripeTestInvoice({
    contractId,
    actor,
    confirmed: true,
  });
  if (invoice.invoiceId !== invoiceAgain.invoiceId) {
    throw new Error("Invoice prepare not idempotent");
  }

  let payResult: { paid: boolean; status: string | null } = {
    paid: false,
    status: null,
  };
  if (process.env.STRIPE_E2E_PAY === "1") {
    const stripe = getCommercialStripeClient("invoice_create");
    // Use Stripe's published test PaymentMethod id — never construct PAN/CVC or Tokens.
    const paid = await stripe.invoices.pay(invoice.invoiceId, {
      payment_method: STRIPE_TEST_PAYMENT_METHOD_VISA,
    });
    payResult = {
      paid: paid.status === "paid",
      status: paid.status ?? null,
    };
    if (paid.livemode !== false) {
      throw new Error("Paid invoice reported livemode=true — aborting");
    }
  }

  // Poll local eligibility briefly if pay was requested (webhook path)
  let eligibility = {
    onboardingEligible: Boolean(clientSigned.pkg.onboardingEligible),
    eligibilitySource: clientSigned.pkg.stripeTest?.eligibilitySource ?? null,
    invoiceStatus: invoiceAgain.pkg.stripeTest?.invoiceStatus ?? null,
  };
  if (process.env.STRIPE_E2E_PAY === "1") {
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      const { pkg } = await getContractLifecycle(contractId);
      eligibility = {
        onboardingEligible: Boolean(pkg.onboardingEligible),
        eligibilitySource: pkg.stripeTest?.eligibilitySource ?? null,
        invoiceStatus: pkg.stripeTest?.invoiceStatus ?? null,
      };
      if (pkg.onboardingEligible && pkg.stripeTest?.invoiceStatus === "paid") break;
    }
  }

  const after = await fingerprintProposal1();
  if (after.fingerprint !== before.fingerprint) {
    throw new Error("STOP: Proposal ID 1 changed during E2E");
  }

  const { contract, pkg } = await getContractLifecycle(contractId);
  const clientId =
    typeof contract.client === "object"
      ? Number((contract.client as { id: number }).id)
      : Number(contract.client);

  // Confirm onboarding record not started for this client
  const { Client } = await import("pg");
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const onboarding = await pg.query(
    `SELECT id, status FROM client_onboarding WHERE client_id = $1 LIMIT 5`,
    [clientId],
  );
  const clientRow = await pg.query(
    `SELECT id, os_onboarding_status, status FROM clients WHERE id = $1`,
    [clientId],
  );
  await pg.end();

  const report = {
    ok: true,
    testMode: true,
    proposalId,
    contractId,
    clientId,
    proposal1: { before, after, unchanged: true },
    customerIdRedacted: redactStripeId(customer.customerId),
    accountIdRedacted: redactStripeId(customer.accountId),
    customerReused: customerAgain.reused,
    invoiceIdRedacted: redactStripeId(invoice.invoiceId),
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    hostedInvoiceUrlPresent: Boolean(invoice.hostedInvoiceUrl),
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    payResult,
    eligibility,
    onboardingRows: onboarding.rows,
    clientOnboardingStatus: clientRow.rows[0]?.os_onboarding_status ?? null,
    clientStatus: clientRow.rows[0]?.status ?? null,
    documentRefsCount: (pkg.documentRefs ?? []).length,
    operatorUrl: `http://localhost:3000/admin/sales/contracts/${contractId}`,
    manualPayRequired: process.env.STRIPE_E2E_PAY !== "1",
    notice:
      process.env.STRIPE_E2E_PAY === "1"
        ? "Paid via Stripe test PaymentMethod pm_card_visa; confirm webhook established eligibility."
        : "Open hostedInvoiceUrl and pay in Stripe Checkout/hosted invoice (test mode) — then re-check eligibility. Do not paste raw PAN into server code.",
  };

  writeFileSync(join(OUT_DIR, `report-${suffix}.json`), JSON.stringify(report, null, 2));
  if (invoice.hostedInvoiceUrl) {
    writeFileSync(join(OUT_DIR, `hosted-invoice-url-${suffix}.txt`), `${invoice.hostedInvoiceUrl}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("E2E FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
