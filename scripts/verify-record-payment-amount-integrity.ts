/**
 * Record Payment amount-authority regression (Cases A–G).
 * No production writes. Pure helpers + allocation preview validation.
 *
 *   npx tsx scripts/verify-record-payment-amount-integrity.ts
 */

import assert from "node:assert/strict";
import {
  amountAfterApplicationModeChange,
  amountAfterObligationSelection,
  initialRecordPaymentAmountDollars,
  parseAmountDollarsToCents,
} from "../lib/client-command/commercial/record-payment-amount";
import {
  previewExternalPaymentAllocation,
  validateRecordObligationExternalPayment,
} from "../lib/proposal-lifecycle/external-obligation-payment";
import type { InvoiceObligation, ProposedBillingPlan } from "../lib/proposal-lifecycle/types";

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    console.error(`  ✗ ${label}`);
    throw error;
  }
}

function obl(
  partial: Partial<InvoiceObligation> &
    Pick<InvoiceObligation, "id" | "kind" | "label" | "amountCents" | "status">,
): InvoiceObligation {
  return {
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Due on receipt",
    amountPaidCents: 0,
    paymentEvents: [],
    paymentReceipt: null,
    collectionChannel: null,
    stripeDraftInvoiceId: null,
    ...partial,
  };
}

const finalOpen = obl({
  id: "final",
  kind: "final",
  label: "Website Design & Development — Final Payment",
  amountCents: 62_500,
  status: "partially-paid",
  amountPaidCents: 2_500,
  paymentEvents: [
    {
      id: "prior",
      paymentGroupId: "prior-g",
      amountCents: 2_500,
      currency: "USD",
      paidAt: "2026-09-07",
      externalPaymentMethod: "cash-app",
      recordedBy: "test",
      recordedAt: "2026-09-12T00:00:00.000Z",
      collectionChannel: "manual-external",
      idempotencyKey: "prior",
    },
  ],
});

const hostOpen = obl({
  id: "host",
  kind: "addon",
  label: "Hosting",
  amountCents: 29_999,
  status: "pending-trigger",
});

const plan: ProposedBillingPlan = {
  id: "plan",
  currency: "USD",
  oneTimeTotalCents: 62_500,
  obligations: [finalOpen, hostOpen],
  updatedAt: "2026-09-15T00:00:00.000Z",
} as ProposedBillingPlan;

console.log("Record Payment amount integrity");

check("A. $300 entered then Single Obligation $600 remaining → amount stays $300", () => {
  const after = amountAfterObligationSelection({
    currentAmountDollars: "300.00",
    selectedRemainingCents: 60_000,
  });
  assert.equal(after.amountDollars, "300.00");
  assert.equal(parseAmountDollarsToCents(after.amountDollars), 30_000);
  assert.match(after.remainingHelp ?? "", /600\.00/);
});

check("B. row CTA may prefill $600; after edit to $300, mode/obligation change keeps $300", () => {
  const prefilled = initialRecordPaymentAmountDollars({
    initialObligationRemainingCents: 60_000,
  });
  assert.equal(prefilled, "600.00");
  const edited = "300.00";
  const afterMode = amountAfterApplicationModeChange(edited);
  assert.equal(afterMode, "300.00");
  const afterObl = amountAfterObligationSelection({
    currentAmountDollars: edited,
    selectedRemainingCents: 60_000,
  });
  assert.equal(afterObl.amountDollars, "300.00");
});

check("C. enter $300 first, then select $600 remaining obligation → stays $300", () => {
  let amount = "300.00";
  amount = amountAfterObligationSelection({
    currentAmountDollars: amount,
    selectedRemainingCents: 60_000,
  }).amountDollars;
  assert.equal(amount, "300.00");
});

check("D. FIFO preserves operator-entered amount in preview total", () => {
  const preview = previewExternalPaymentAllocation(plan, {
    amountCents: 30_000,
    allocationMode: "fifo",
  });
  assert.ok(!("ok" in preview && preview.ok === false));
  const ok = preview as {
    totalAmountCents: number;
    unallocatedCents: number;
    legs: Array<{ amountCents: number }>;
  };
  assert.equal(ok.totalAmountCents, 30_000);
  assert.equal(
    ok.legs.reduce((s, l) => s + l.amountCents, 0),
    30_000 - ok.unallocatedCents,
  );
});

check("E. Selected obligations: legs reconcile exactly to transaction amount", () => {
  const preview = previewExternalPaymentAllocation(plan, {
    amountCents: 30_000,
    allocationMode: "fifo",
    allowedObligationIds: ["final"],
  });
  assert.ok(!("ok" in preview && preview.ok === false));
  const ok = preview as {
    totalAmountCents: number;
    unallocatedCents: number;
    legs: Array<{ obligationId: string; amountCents: number }>;
  };
  assert.equal(ok.totalAmountCents, 30_000);
  assert.equal(ok.unallocatedCents, 0);
  assert.equal(ok.legs.length, 1);
  assert.equal(ok.legs[0]!.obligationId, "final");
  assert.equal(ok.legs[0]!.amountCents, 30_000);
});

check("F. allocating more than transaction amount is rejected", () => {
  const preview = previewExternalPaymentAllocation(plan, {
    amountCents: 30_000,
    allocationMode: "explicit",
    allocations: [{ obligationId: "final", amountCents: 40_000 }],
  });
  assert.equal("ok" in preview && preview.ok === false, true);
});

check("G. paying more than obligation remaining is rejected", () => {
  const result = validateRecordObligationExternalPayment(
    {
      obligationId: "final",
      amountCents: 60_001,
      paidAt: "2026-09-14",
      externalPaymentMethod: "cash-app",
      recordedBy: "test@kreatebydesign.com",
      paidOutsideStripe: true,
    },
    { contractId: 2, plan },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.amountCents ?? "", /remaining/i);
  }

  const okAmount = validateRecordObligationExternalPayment(
    {
      obligationId: "final",
      amountCents: 30_000,
      paidAt: "2026-09-14",
      externalPaymentMethod: "cash-app",
      recordedBy: "test@kreatebydesign.com",
      paidOutsideStripe: true,
    },
    { contractId: 2, plan },
  );
  assert.equal(okAmount.ok, true);
  if (okAmount.ok) {
    assert.equal(okAmount.event.amountCents, 30_000);
  }
});

console.log(`\n${passed} checks passed`);
