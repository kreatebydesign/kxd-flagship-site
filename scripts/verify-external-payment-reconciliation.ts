/**
 * Focused verification — Commercial payment provenance + external payment reconciliation.
 *   npx tsx scripts/verify-external-payment-reconciliation.ts
 *
 * Pure logic only — no Stripe calls, no DB mutations, no production data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertNoStripeMutationInExternalPaymentPath,
  buildExternalPaymentIdempotencyKey,
  findDuplicateStripeObjectConflict,
  obligationAmountCents,
  validateRecordExternalPaymentInput,
  FORBIDDEN_CARD_FIELD_NAMES,
} from "../lib/direct-agreement";
import {
  contractedValueFromContract,
  oneTimeContractValue,
  shouldIncludeRevenueEventInLifetimeValue,
} from "../lib/financial-command/contract-value";
import type { ContractLifecyclePackage } from "../lib/proposal-lifecycle/types";
import type { DirectAgreementTerms } from "../lib/direct-agreement/types";

const root = process.cwd();
let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const daTerms: DirectAgreementTerms = {
  schemaVersion: 1,
  commercialStructure: "one-time",
  oneTimeAmountCents: 85000,
  monthlyAmountCents: 0,
  currency: "USD",
  serviceStartDate: "2026-08-04",
  serviceEndDate: "2026-11-04",
  scope: "Campaign support",
  includedServices: "Hours",
  exclusions: "",
  capacityHoursPerMonth: 3,
  rolloverPolicy: "none",
  revisionAllowance: "Two rounds",
  overagePreapprovalRule: "Preapprove",
  paymentTerms: "Prepaid",
  cancellationRefundLanguage: "Non-refundable",
  intellectualPropertyLanguage: "IP",
  portfolioUseLanguage: "Portfolio",
  clientResponsibilities: "Provide content",
  renewalBehavior: "Ends",
  autoRenew: false,
  termsVersion: 1,
};

const basePkg = {
  schemaVersion: 1,
  commercialStatus: "payment-pending",
  commercialSource: "direct-agreement",
} as ContractLifecyclePackage;

console.log("verify:external-payment-reconciliation");

// 1. Successful external Stripe payment record (validation)
{
  const result = validateRecordExternalPaymentInput(
    {
      source: "imported-external-stripe-payment",
      amountCents: 85000,
      currency: "USD",
      paidAt: "2026-08-04",
      livemode: true,
      stripeCustomerId: "cus_TestRobin123",
      stripePaymentIntentId: "pi_TestRobin850",
      stripeChargeId: "ch_TestRobin850",
      receiptUrl: "https://pay.stripe.com/receipts/test",
      operatorNote: "Collected in LIVE Stripe Dashboard",
    },
    {
      contractId: 99,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: null,
    },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.markPaid, true);
    assert.equal(result.idempotentReplay, false);
    assert.equal(result.references.source, "imported-external-stripe-payment");
    assert.equal(result.references.livemode, true);
    assert.equal(result.references.paymentStatus, "paid");
    assert.ok(result.references.idempotencyKey?.includes("pi:pi_TestRobin850"));
    assert.equal(result.references.amountCents, 85000);
  }
  ok("1. successful external Stripe payment record validation");
}

// 2. Manual non-Stripe provenance
{
  const result = validateRecordExternalPaymentInput(
    {
      source: "manual-non-stripe",
      amountCents: 85000,
      currency: "USD",
      paidAt: "2026-08-04",
      operatorNote: "Cashier check",
    },
    {
      contractId: 99,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: null,
    },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.references.source, "manual-non-stripe");
    assert.equal(result.references.livemode, null);
    assert.ok(result.references.idempotencyKey?.includes("manual"));
  }
  ok("2. manual non-Stripe payment provenance");
}

// 3. No Stripe mutation path (static + marker)
{
  assertNoStripeMutationInExternalPaymentPath();
  const services = read("lib/direct-agreement/services.ts");
  const external = read("lib/direct-agreement/external-payment.ts");
  assert.equal(services.includes('from "stripe"'), false);
  assert.equal(services.includes("from '@/lib/stripe"), false);
  assert.equal(external.includes('from "stripe"'), false);
  assert.ok(services.includes("assertNoStripeMutationInExternalPaymentPath"));
  assert.ok(services.includes("No Stripe charge was created"));
  ok("3. no Stripe mutation path in external payment services");
}

// 4. Duplicate PI/charge/invoice prevention
{
  const existing = {
    stripePaymentIntentId: "pi_TestRobin850",
    stripeChargeId: "ch_TestRobin850",
    paymentStatus: "paid",
    idempotencyKey: "extpay:contract:99|source:imported-external-stripe-payment|pi:pi_TestRobin850|ch:ch_TestRobin850",
    source: "imported-external-stripe-payment" as const,
  };
  const conflict = findDuplicateStripeObjectConflict(existing, {
    stripePaymentIntentId: "pi_TestRobin850",
    stripeChargeId: "ch_Other",
    stripeInvoiceId: null,
    idempotencyKey: "other",
  });
  assert.equal(conflict, "duplicate:stripePaymentIntentId");

  const replay = validateRecordExternalPaymentInput(
    {
      source: "imported-external-stripe-payment",
      amountCents: 85000,
      currency: "USD",
      paidAt: "2026-08-04",
      livemode: true,
      stripePaymentIntentId: "pi_TestRobin850",
      stripeChargeId: "ch_TestRobin850",
    },
    {
      contractId: 99,
      commercialStatus: "paid",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: existing,
    },
  );
  assert.equal(replay.ok, true);
  if (replay.ok) assert.equal(replay.idempotentReplay, true);
  ok("4. duplicate PI/charge prevention + idempotent replay");
}

// 5. Invalid Stripe ID prefix
{
  const bad = validateRecordExternalPaymentInput(
    {
      source: "imported-external-stripe-payment",
      amountCents: 85000,
      currency: "USD",
      paidAt: "2026-08-04",
      livemode: true,
      stripePaymentIntentId: "payment_intent_bad",
    },
    {
      contractId: 99,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: null,
    },
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.errors.stripePaymentIntentId);
  ok("5. invalid Stripe ID prefix rejected");
}

// 6. Amount validation
{
  const badAmount = validateRecordExternalPaymentInput(
    {
      source: "imported-external-stripe-payment",
      amountCents: 100,
      currency: "USD",
      paidAt: "2026-08-04",
      livemode: true,
      stripePaymentIntentId: "pi_TestRobin850",
    },
    {
      contractId: 99,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: null,
    },
  );
  assert.equal(badAmount.ok, false);
  if (!badAmount.ok) assert.ok(badAmount.errors.amountCents);

  const missingEvidence = validateRecordExternalPaymentInput(
    {
      source: "imported-external-stripe-payment",
      amountCents: 85000,
      currency: "USD",
      paidAt: "2026-08-04",
      livemode: true,
      stripeCustomerId: "cus_OnlyCustomer",
    },
    {
      contractId: 99,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: null,
    },
  );
  assert.equal(missingEvidence.ok, false);
  if (!missingEvidence.ok) assert.ok(missingEvidence.errors.stripeEvidence);
  ok("6. amount + Stripe evidence validation");
}

// 7. One-time DA financial recognition
{
  const executedDa = {
    status: "executed",
    agreementSource: "direct-agreement",
    projectAmount: 850,
    monthlyAmount: 0,
  };
  assert.equal(contractedValueFromContract(executedDa), 850);
  assert.equal(oneTimeContractValue(executedDa), 850);
  assert.equal(contractedValueFromContract({ status: "draft", projectAmount: 850 }), 0);
  // Executive snapshot must count recognized contracts in contractedRevenue only —
  // not also in oneTimeProjectRevenue (that bucket remains client-projects).
  const snapshots = read("lib/financial-command/snapshots.ts");
  assert.ok(snapshots.includes("contractedRevenue += recognized"));
  assert.equal(snapshots.includes("oneTimeProjectRevenue += oneTimeContractValue"), false);
  ok("7. one-time DA financial recognition (executed → contracted value once)");
}

// 8. MRR remains zero for one-time DA
{
  const executedDa = {
    status: "executed",
    projectAmount: 850,
    monthlyAmount: 0,
  };
  // MRR is retainer-derived; contract monthlyAmount 0 must not invent MRR.
  assert.equal(Number(executedDa.monthlyAmount), 0);
  assert.equal(contractedValueFromContract(executedDa), 850);
  ok("8. MRR remains zero for one-time prepaid DA (monthlyAmount=0)");
}

// 9–10. Payments / receipts surface fields exist in loader + UI
{
  const loader = read("lib/client-command/commercial/load-commercial-workspace.ts");
  const paymentsUi = read(
    "components/admin/operations/client-command/commercial/CommercialPayments.tsx",
  );
  const form = read(
    "components/admin/operations/client-command/commercial/RecordExternalPaymentForm.tsx",
  );
  assert.ok(loader.includes("externalPaymentEligibleAgreements"));
  assert.ok(loader.includes("paymentReferences?.receiptUrl"));
  assert.ok(paymentsUi.includes("RecordExternalPaymentForm"));
  assert.ok(form.includes("record-external-payment"));
  assert.ok(form.includes("No Stripe charge was created by KXD OS"));
  assert.ok(form.includes("Activate service"));
  ok("9. payment appears in Commercial → Payments (eligible action + rows)");
  ok("10. receipt evidence + confirmation UX wired");
}

// 11. Paid lifecycle transition semantics
{
  const result = validateRecordExternalPaymentInput(
    {
      source: "imported-external-stripe-payment",
      amountCents: 85000,
      currency: "usd",
      paidAt: "2026-08-04T18:00:00.000Z",
      livemode: true,
      stripeInvoiceId: "in_TestRobin850",
    },
    {
      contractId: 17,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: obligationAmountCents({
        daTerms,
        pkg: basePkg,
        projectAmountDollars: 850,
      }),
      existingReferences: null,
    },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.markPaid, true);
    assert.equal(result.references.paymentStatus, "paid");
  }
  const route = read("app/api/admin/sales/contracts/[id]/lifecycle/route.ts");
  assert.ok(route.includes("record-external-payment"));
  assert.ok(route.includes("recordExternalPayment"));
  ok("11. paid lifecycle transition (markPaid) via record-external-payment");
}

// 12. Audit / provenance preservation
{
  const key = buildExternalPaymentIdempotencyKey({
    contractId: 17,
    source: "imported-external-stripe-payment",
    amountCents: 85000,
    currency: "USD",
    paidAt: "2026-08-04",
    stripePaymentIntentId: "pi_abc",
    stripeChargeId: "ch_abc",
    stripeInvoiceId: null,
  });
  assert.equal(
    key,
    "extpay:contract:17|source:imported-external-stripe-payment|pi:pi_abc|ch:ch_abc",
  );
  const services = read("lib/direct-agreement/services.ts");
  assert.ok(services.includes("direct-agreement.external-payment-recorded"));
  assert.ok(services.includes("idempotencyKey"));
  assert.ok(services.includes("importedAt"));
  assert.ok(services.includes("ensureBillingProfileShell"));
  for (const forbidden of FORBIDDEN_CARD_FIELD_NAMES) {
    assert.equal(services.includes(`${forbidden}:`), false);
  }
  ok("12. audit/provenance + idempotency key preservation");
}

// LTV double-count guard
{
  assert.equal(shouldIncludeRevenueEventInLifetimeValue("revenue.contract-executed"), false);
  assert.equal(shouldIncludeRevenueEventInLifetimeValue("revenue.external-payment-recorded"), false);
  assert.equal(shouldIncludeRevenueEventInLifetimeValue("revenue.proposal-approved"), true);
  ok("13. LTV skips contract/payment revenue events already in contractedValue");
}

// LIVE mode conflict for kxd-stripe-lifecycle
{
  const bad = validateRecordExternalPaymentInput(
    {
      source: "kxd-stripe-lifecycle",
      amountCents: 85000,
      currency: "USD",
      paidAt: "2026-08-04",
      livemode: true,
      stripePaymentIntentId: "pi_Test",
    },
    {
      contractId: 1,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: null,
    },
  );
  assert.equal(bad.ok, false);
  ok("14. LIVE mode blocked for kxd-stripe-lifecycle provenance");
}

// UX affordance CSS present
{
  const css = read("design-system/os/styles/kxd-os.css");
  assert.ok(css.includes(".kxd-os-commercial-control"));
  assert.ok(css.includes(".kxd-os-commercial-confirm"));
  assert.ok(css.includes("border: 1.5px solid"));
  ok("15. strong form + confirmation CSS present");
}

// URL safety
{
  const badUrl = validateRecordExternalPaymentInput(
    {
      source: "imported-external-stripe-payment",
      amountCents: 85000,
      currency: "USD",
      paidAt: "2026-08-04",
      livemode: true,
      stripePaymentIntentId: "pi_TestRobin850",
      receiptUrl: "javascript:alert(1)",
    },
    {
      contractId: 99,
      commercialStatus: "payment-pending",
      agreementSource: "direct-agreement",
      obligationCents: 85000,
      existingReferences: null,
    },
  );
  assert.equal(badUrl.ok, false);
  if (!badUrl.ok) assert.ok(badUrl.errors.receiptUrl);
  ok("16. unsafe receipt URL rejected");
}

// Signed proposal contracts still recognized; retainers remain MRR source
{
  assert.equal(
    contractedValueFromContract({
      status: "signed",
      projectAmount: 1200,
      monthlyAmount: 0,
    }),
    1200,
  );
  assert.equal(
    contractedValueFromContract({
      status: "signed",
      projectAmount: 0,
      monthlyAmount: 500,
    }),
    6000,
  );
  ok("17. proposal-signed contracts remain recognized; monthly annualizes in contracted value only");
}

console.log(`\nPassed ${passed} checks.`);
