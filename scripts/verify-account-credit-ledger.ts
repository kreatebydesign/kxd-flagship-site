/**
 * Focused verification — audited account credits on the obligation ledger.
 *   npx tsx scripts/verify-account-credit-ledger.ts
 */

import assert from "node:assert/strict";
import {
  applyAccountCredit,
  normalizeAccountCreditHistory,
  previewAccountCreditAllocation,
} from "../lib/proposal-lifecycle/account-credit";
import {
  applyAllocatedExternalPayment,
} from "../lib/proposal-lifecycle/external-obligation-payment";
import {
  obligationAmountCreditedCents,
  obligationAmountPaidCents,
  obligationRemainingCents,
  sumCurrentlyOutstandingCents,
} from "../lib/proposal-lifecycle/obligation-balances";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
} from "../lib/proposal-lifecycle/types";
import {
  composeAccountStatement,
  validateAccountStatement,
} from "../lib/commercial-documents/account-statement";
import { normalizeObligationPaymentHistory } from "../lib/commercial-documents/account-statement/normalize-payment-history";

let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function basePlan(obligations: InvoiceObligation[]): ProposedBillingPlan {
  return {
    schemaVersion: 1,
    id: "plan_test",
    status: "active",
    invoiceReadiness: "ready-for-review",
    contractId: 2,
    proposalId: 2,
    proposalNumber: "PFW-1",
    contractVersion: 1,
    contractHash: "hash",
    currency: "USD",
    oneTimeTotalCents: 250_000,
    monthlyTotalCents: 32_500,
    obligations,
    recurring: null,
    issues: [],
    reconciliation: {
      contractOneTimeCents: 250_000,
      obligationsSumCents: obligations
        .filter((o) => o.kind === "initial" || o.kind === "milestone" || o.kind === "final")
        .reduce((sum, o) => sum + o.amountCents, 0),
      differenceCents: 0,
      creditsAppliedOnce: true,
    },
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
}

function basePkg(plan: ProposedBillingPlan): ContractLifecyclePackage {
  return {
    schemaVersion: 1,
    status: "executed",
    auditEvents: [],
    billingPlan: plan,
  } as ContractLifecyclePackage;
}

function obligation(
  partial: Partial<InvoiceObligation> &
    Pick<InvoiceObligation, "id" | "kind" | "label" | "amountCents">,
): InvoiceObligation {
  return {
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Due on date",
    status: "sent",
    dueDate: "2026-09-01",
    amountPaidCents: 0,
    paymentEvents: [],
    creditEvents: [],
    collectionChannel: null,
    paymentReceipt: null,
    ...partial,
  };
}

console.log("verify:account-credit-ledger");

{
  const final = obligation({
    id: "pfw-rem-2",
    kind: "final",
    label: "Website Design & Development — Final Payment",
    amountCents: 62_500,
    status: "partially-paid",
    dueDate: "2026-09-15",
    amountPaidCents: 32_500,
    paymentEvents: [
      {
        id: "payevt_prior",
        paymentGroupId: "paygrp_prior",
        amountCents: 32_500,
        currency: "USD",
        paidAt: "2026-09-14",
        externalPaymentMethod: "cash-app",
        recordedBy: "matt@kreatebydesign.com",
        recordedAt: "2026-09-14T00:00:00.000Z",
        collectionChannel: "manual-external",
        idempotencyKey: "prior",
      },
    ],
  });
  const sept = obligation({
    id: "obl_sept",
    kind: "recurring-period",
    label: "Website Growth & Management — 2026-09",
    amountCents: 32_500,
    dueDate: "2026-09-01",
    serviceTitle: "Website Growth & Management",
  });
  const hosting = obligation({
    id: "pfw-hosting-y1",
    kind: "addon",
    label: "KXD Managed Website Hosting",
    amountCents: 29_999,
    dueDate: "2026-09-27",
    trigger: "on-date",
    billingCadence: "annual",
  });
  const oct = obligation({
    id: "obl_oct",
    kind: "recurring-period",
    label: "Website Growth & Management — 2026-10",
    amountCents: 32_500,
    dueDate: "2026-10-01",
    serviceTitle: "Website Growth & Management",
  });
  const domain = obligation({
    id: "pfw-domain-y1",
    kind: "addon",
    label: ".com domain registration",
    amountCents: 1_019,
    status: "paid",
    dueDate: "2026-09-01",
    amountPaidCents: 1_019,
    paymentEvents: [
      {
        id: "payevt_domain",
        paymentGroupId: "paygrp_oct10",
        amountCents: 1_019,
        currency: "USD",
        paidAt: "2026-10-10",
        externalPaymentMethod: "cash-app",
        recordedBy: "matt@kreatebydesign.com",
        recordedAt: "2026-10-10T00:00:00.000Z",
        collectionChannel: "manual-external",
        idempotencyKey: "domain",
      },
    ],
  });
  // Sept already partially paid by Oct 10 cash (mirror live).
  sept.status = "partially-paid";
  sept.amountPaidCents = 13_981;
  sept.paymentEvents = [
    {
      id: "payevt_sept",
      paymentGroupId: "paygrp_oct10",
      amountCents: 13_981,
      currency: "USD",
      paidAt: "2026-10-10",
      externalPaymentMethod: "cash-app",
      recordedBy: "matt@kreatebydesign.com",
      recordedAt: "2026-10-10T00:00:00.000Z",
      collectionChannel: "manual-external",
      idempotencyKey: "sept",
    },
  ];

  let pkg = basePkg(basePlan([final, domain, hosting, sept, oct]));

  const paid = applyAllocatedExternalPayment(pkg, {
    contractId: 2,
    amountCents: 40_000,
    paidAt: "2026-09-27",
    externalPaymentMethod: "cash-app",
    externalReference: "Cash App — HJ Brennecke — 09/27/2026",
    recordedBy: "matt@kreatebydesign.com",
    allocationMode: "explicit",
    allocations: [{ obligationId: "pfw-rem-2", amountCents: 30_000 }],
    overageAsAccountCredit: {
      sourceType: "project-overage",
      label: "Project payment overage",
      reason: "Project payment overage",
      note: "HJ paid $2,600 toward the $2,500 website project.",
      allocationMode: "fifo",
    },
    clientIdempotencyKey: "platinum-sept27-400",
  });
  assert.equal(paid.ok, true);
  if (!paid.ok) throw new Error("payment failed");
  pkg = paid.pkg;
  ok("1. Sept 27 $400 Cash App with $300 final + $100 project-overage credit");

  const nextFinal = pkg.billingPlan!.obligations.find((o) => o.id === "pfw-rem-2")!;
  assert.equal(obligationAmountPaidCents(nextFinal), 62_500);
  assert.equal(obligationRemainingCents(nextFinal), 0);
  assert.equal(nextFinal.status, "paid");
  ok("2. Final Payment fully settled by cash");

  const history = normalizeObligationPaymentHistory(pkg.billingPlan!.obligations);
  const sept27 = history.find((p) => p.paidOn === "2026-09-27");
  assert.ok(sept27);
  assert.equal(sept27!.amountCents, 40_000);
  ok("3. Payment history preserves one real $400 Cash App transaction");

  const credits = normalizeAccountCreditHistory(pkg.billingPlan!.obligations);
  assert.equal(credits.length, 1);
  assert.equal(credits[0]!.amountCents, 10_000);
  assert.equal(credits[0]!.sourceType, "project-overage");
  assert.ok(credits[0]!.sourcePaymentGroupId);
  ok("4. $100 project-overage credit linked to payment group");

  const credited = applyAccountCredit(pkg, {
    contractId: 2,
    amountCents: 10_000,
    creditedAt: "2026-10-10",
    sourceType: "referral-credit",
    label: "KXD Referral Credit — Cody Thompson",
    reason: "Referral credit",
    note:
      "Referral credit for connecting Kreate by Design with Cody Thompson / Twisted Creek Logistics; project closed.",
    recordedBy: "matt@kreatebydesign.com",
    allocationMode: "fifo",
    clientIdempotencyKey: "platinum-referral-cody-2026-10-10",
  });
  assert.equal(credited.ok, true);
  if (!credited.ok) throw new Error("referral credit failed");
  pkg = credited.pkg;
  ok("5. Oct 10 Cody Thompson referral credit recorded");

  const outstanding = sumCurrentlyOutstandingCents(
    pkg.billingPlan!.obligations,
    "2026-10-10",
  );
  assert.equal(outstanding, 61_018);
  ok("6. Outstanding balance is $610.18");

  const serviceRemaining = pkg.billingPlan!.obligations
    .filter((o) => o.kind !== "initial" && o.kind !== "milestone" && o.kind !== "final")
    .reduce((sum, o) => sum + o.amountCents, 0);
  assert.equal(serviceRemaining, 1_019 + 29_999 + 32_500 + 32_500);
  ok("7. Service/infrastructure charges total $960.18");

  const composed = composeAccountStatement({
    id: "stmt_test",
    clientName: "Platinum Film Workz",
    statementDate: "2026-10-10",
    obligations: pkg.billingPlan!.obligations,
  });
  const issues = validateAccountStatement(composed.document);
  assert.deepEqual(issues, []);
  assert.equal(composed.document.summary.totalOutstandingCents, 61_018);
  assert.equal(composed.document.summary.accountCreditsAppliedCents, 20_000);
  assert.equal(composed.document.creditHistory?.credits.length, 2);
  ok("8. Account statement validates with credits and $610.18 due");

  // Credits are not cash
  const totalCash = normalizeObligationPaymentHistory(pkg.billingPlan!.obligations).reduce(
    (sum, p) => sum + p.amountCents,
    0,
  );
  const totalCredited = pkg.billingPlan!.obligations.reduce(
    (sum, o) => sum + obligationAmountCreditedCents(o),
    0,
  );
  assert.equal(totalCredited, 20_000);
  assert.ok(totalCash >= 40_000 + 15_000);
  ok("9. Credits remain distinct from cash payment totals");

  const preview = previewAccountCreditAllocation(pkg.billingPlan!, {
    amountCents: 1_000,
    allocationMode: "fifo",
  });
  assert.equal("ok" in preview && preview.ok === false, false);
  ok("10. Credit allocation preview remains available after settlement");
}

console.log(`\nverify:account-credit-ledger passed (${passed} checks)`);
