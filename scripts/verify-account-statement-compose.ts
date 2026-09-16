/**
 * Batch B — Ledger-driven Account Statement composer tests.
 *
 *   npx tsx scripts/verify-account-statement-compose.ts
 */

import assert from "node:assert/strict";
import {
  composeAccountStatement,
  composePlatinumFilmWorkzStatement20260912,
  buildPlatinumFilmWorkzLedgerObligations,
  normalizeObligationPaymentHistory,
  validateAccountStatement,
} from "../lib/commercial-documents/account-statement";
import { aggregateObligationBalances } from "../lib/proposal-lifecycle/obligation-balances";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";
import type { ObligationPaymentEvent } from "../lib/proposal-lifecycle/external-obligation-payment";

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

function event(partial: {
  id: string;
  paymentGroupId: string;
  amountCents: number;
  paidAt?: string;
  externalPaymentMethod?: ObligationPaymentEvent["externalPaymentMethod"];
  externalReference?: string | null;
  stripeInvoiceId?: string | null;
}): ObligationPaymentEvent {
  return {
    id: partial.id,
    paymentGroupId: partial.paymentGroupId,
    amountCents: partial.amountCents,
    currency: "USD",
    paidAt: partial.paidAt ?? "2026-09-01T00:00:00.000Z",
    externalPaymentMethod: partial.externalPaymentMethod ?? "zelle",
    externalReference: partial.externalReference ?? null,
    recordedBy: "test",
    recordedAt: partial.paidAt ?? "2026-09-01T00:00:00.000Z",
    stripeInvoiceId: partial.stripeInvoiceId ?? null,
    collectionChannel: "manual-external",
    idempotencyKey: `test:${partial.id}`,
  };
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

console.log("Account Statement composer");

check("A. unpaid obligation → paid $0, outstanding = amount", () => {
  const obligations = [
    obl({
      id: "u1",
      kind: "milestone",
      label: "Milestone",
      amountCents: 100_000,
      status: "pending-trigger",
    }),
  ];
  const { document, ledger } = composeAccountStatement({
    id: "t-a",
    clientName: "Test",
    statementDate: "2026-09-12",
    obligations,
  });
  assert.equal(ledger.paidCents, 0);
  assert.equal(ledger.remainingCents, 100_000);
  assert.equal(document.summary.totalOutstandingCents, 100_000);
  assert.equal(document.paymentHistory.payments.length, 0);
  assert.equal(validateAccountStatement(document).length, 0);
});

check("B. partial payment renders correctly", () => {
  const obligations = [
    obl({
      id: "p1",
      kind: "final",
      label: "Final",
      amountCents: 100_000,
      status: "partially-paid",
      amountPaidCents: 40_000,
      paymentEvents: [
        event({ id: "e1", paymentGroupId: "g1", amountCents: 40_000 }),
      ],
    }),
  ];
  const { document, ledger } = composeAccountStatement({
    id: "t-b",
    clientName: "Test",
    statementDate: "2026-09-12",
    obligations,
  });
  assert.equal(ledger.paidCents, 40_000);
  assert.equal(ledger.remainingCents, 60_000);
  assert.equal(document.summary.paymentsReceivedCents, 40_000);
  assert.equal(document.summary.projectBalanceCents, 60_000);
  assert.equal(document.paymentHistory.payments.length, 1);
  assert.equal(document.paymentHistory.payments[0]!.amountCents, 40_000);
});

check("C. fully paid obligation → outstanding $0", () => {
  const obligations = [
    obl({
      id: "f1",
      kind: "initial",
      label: "Deposit",
      amountCents: 50_000,
      status: "paid",
      amountPaidCents: 50_000,
      paymentEvents: [
        event({ id: "e1", paymentGroupId: "g1", amountCents: 50_000 }),
      ],
    }),
  ];
  const { document, ledger } = composeAccountStatement({
    id: "t-c",
    clientName: "Test",
    statementDate: "2026-09-12",
    obligations,
  });
  assert.equal(ledger.paidCents, 50_000);
  assert.equal(ledger.remainingCents, 0);
  assert.equal(document.summary.totalOutstandingCents, 0);
  assert.equal(document.currentCharges.items.length, 0);
});

check("D. open Stripe invoice with NO payment → paid stays $0 for that obligation", () => {
  const obligations = [
    obl({
      id: "svc1",
      kind: "recurring-period",
      label: "Growth — 2026-09",
      amountCents: 32_500,
      status: "pending-trigger",
      billingCadence: "monthly",
      dueDate: "2026-09-01",
      serviceTitle: "Growth",
      stripeDraftInvoiceId: "in_open_test",
    }),
  ];
  const { document, ledger } = composeAccountStatement({
    id: "t-d",
    clientName: "Test",
    statementDate: "2026-09-12",
    obligations,
    openInvoice: {
      invoiceNumber: "TEST-0001",
      stripeInvoiceId: "in_open_test",
      status: "open",
      amountDueCents: 32_500,
      obligationIds: ["svc1"],
    },
  });
  assert.equal(ledger.paidCents, 0);
  assert.equal(ledger.remainingCents, 32_500);
  assert.equal(ledger.openInvoiceAmountDueCents, 32_500);
  assert.equal(document.summary.paymentsReceivedCents, 0);
  assert.match(
    document.currentCharges.existingInvoiceNote ?? "",
    /Open invoice/i,
  );
  assert.doesNotMatch(
    document.currentCharges.existingInvoiceNote ?? "",
    /\b(covered|settled)\b/i,
  );
  assert.doesNotMatch(
    document.currentCharges.existingInvoiceNote ?? "",
    /\b(paid|received)\b(?! evidence)/i,
  );
  assert.ok(
    document.closingNotes.some((n) => /not payment evidence/i.test(n.body)),
  );
});

check("E. one real payment allocated across multiple obligations groups as one row", () => {
  const obligations = [
    obl({
      id: "a",
      kind: "milestone",
      label: "A",
      amountCents: 30_000,
      status: "paid",
      amountPaidCents: 30_000,
      paymentEvents: [
        event({
          id: "e-a",
          paymentGroupId: "shared-pay",
          amountCents: 30_000,
          paidAt: "2026-08-21T12:00:00.000Z",
        }),
      ],
    }),
    obl({
      id: "b",
      kind: "milestone",
      label: "B",
      amountCents: 20_000,
      status: "paid",
      amountPaidCents: 20_000,
      paymentEvents: [
        event({
          id: "e-b",
          paymentGroupId: "shared-pay",
          amountCents: 20_000,
          paidAt: "2026-08-21T12:00:00.000Z",
        }),
      ],
    }),
  ];
  const grouped = normalizeObligationPaymentHistory(obligations);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0]!.amountCents, 50_000);
  assert.deepEqual(grouped[0]!.obligationIds.sort(), ["a", "b"]);

  const { document, ledger } = composeAccountStatement({
    id: "t-e",
    clientName: "Test",
    statementDate: "2026-09-12",
    obligations,
  });
  assert.equal(document.paymentHistory.payments.length, 1);
  assert.equal(document.paymentHistory.payments[0]!.amountCents, 50_000);
  assert.equal(
    document.paymentHistory.payments[0]!.label,
    "Website Design & Development — Project Payment",
  );
  assert.doesNotMatch(
    document.paymentHistory.payments[0]!.label,
    /A;\s*B|B;\s*A/,
  );
  assert.equal(ledger.paidCents, 50_000);
});

check("E2. multi-obligation allocation never concatenates staged titles", () => {
  const obligations = [
    obl({
      id: "progress",
      kind: "milestone",
      label: "Website Design & Development — Progress Payment",
      amountCents: 150_000,
      status: "paid",
      amountPaidCents: 150_000,
      paymentEvents: [
        event({
          id: "e-progress",
          paymentGroupId: "sep-pay",
          amountCents: 150_000,
          paidAt: "2026-09-10T12:00:00.000Z",
          externalPaymentMethod: "stripe",
          stripeInvoiceId: "in_1FakeStripeObjectId",
          externalReference: "in_1FakeStripeObjectId",
        }),
      ],
    }),
    obl({
      id: "final",
      kind: "final",
      label: "Website Design & Development — Final Payment",
      amountCents: 300_000,
      status: "partially-paid",
      amountPaidCents: 100_000,
      paymentEvents: [
        event({
          id: "e-final",
          paymentGroupId: "sep-pay",
          amountCents: 100_000,
          paidAt: "2026-09-10T12:00:00.000Z",
          externalPaymentMethod: "stripe",
          stripeInvoiceId: "in_1FakeStripeObjectId",
          externalReference: "in_1FakeStripeObjectId",
        }),
      ],
    }),
  ];
  const grouped = normalizeObligationPaymentHistory(obligations);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0]!.amountCents, 250_000);
  assert.equal(
    grouped[0]!.label,
    "Website Design & Development — Project Payment",
  );
  assert.equal(grouped[0]!.reference, null);
  assert.doesNotMatch(grouped[0]!.label, /Final Payment/i);
  assert.doesNotMatch(grouped[0]!.label, /Progress Payment.*Final Payment/i);

  const { document } = composeAccountStatement({
    id: "t-e2",
    clientName: "de Bois Entertainment",
    statementDate: "2026-09-15",
    obligations,
  });
  assert.equal(document.paymentHistory.payments.length, 1);
  assert.equal(
    document.paymentHistory.payments[0]!.label,
    "Website Design & Development — Project Payment",
  );
  assert.equal(document.paymentHistory.payments[0]!.detail, "Stripe");
  assert.doesNotMatch(
    JSON.stringify(document.paymentHistory),
    /in_1FakeStripeObjectId/,
  );
  const finalOpen = document.openBalances.items.find((item) => item.id === "final");
  assert.ok(finalOpen);
  assert.equal(finalOpen!.remainingCents, 200_000);
  assert.equal(finalOpen!.statusLabel, "Partially Paid");
});

check("E3. partial single-leg Final Payment uses neutral project label", () => {
  const obligations = [
    obl({
      id: "final",
      kind: "final",
      label: "Website Design & Development — Final Payment",
      amountCents: 300_000,
      status: "partially-paid",
      paymentEvents: [
        event({
          id: "partial",
          paymentGroupId: "g-partial",
          amountCents: 100_000,
          paidAt: "2026-09-10T12:00:00.000Z",
        }),
      ],
    }),
  ];
  const grouped = normalizeObligationPaymentHistory(obligations);
  assert.equal(grouped.length, 1);
  assert.equal(
    grouped[0]!.label,
    "Website Design & Development — Project Payment",
  );
  assert.doesNotMatch(grouped[0]!.label, /Final Payment/i);
});

check("F. aggregate statement totals reconcile with canonical ledger helpers", () => {
  const obligations = buildPlatinumFilmWorkzLedgerObligations();
  const canonical = aggregateObligationBalances(obligations);
  const { ledger, document } = composePlatinumFilmWorkzStatement20260912();
  assert.equal(ledger.totalCents, canonical.totalCents);
  assert.equal(ledger.paidCents, canonical.paidCents);
  assert.equal(ledger.remainingCents, canonical.remainingCents);
  // Currently outstanding excludes launch-gated remaining.
  assert.equal(document.summary.totalOutstandingCents, 93_519);
  assert.equal(canonical.remainingCents, 123_518);
  assert.equal(validateAccountStatement(document).length, 0);
});

check("G. Platinum-shaped regression totals + open invoice", () => {
  const { document, ledger } = composePlatinumFilmWorkzStatement20260912();
  assert.equal(ledger.totalCents, 313_518);
  assert.equal(ledger.paidCents, 190_000);
  assert.equal(ledger.remainingCents, 123_518);
  assert.equal(ledger.projectRemainingCents, 60_000);
  assert.equal(ledger.openServiceChargesCents, 63_518);
  assert.equal(ledger.openInvoiceAmountDueCents, 63_518);
  assert.equal(document.summary.originalProjectCents, 250_000);
  assert.equal(document.summary.paymentsReceivedCents, 190_000);
  assert.equal(document.summary.projectBalanceCents, 60_000);
  assert.equal(document.summary.currentChargesCents, 33_519);
  assert.equal(document.summary.totalOutstandingCents, 93_519);
  assert.equal(document.openBalances.totalRemainingCents, 93_519);
  assert.equal(
    document.openBalances.items.reduce((sum, item) => sum + item.remainingCents, 0),
    93_519,
  );
  assert.equal(document.openBalances.upcomingItems.length, 1);
  assert.equal(document.openBalances.upcomingItems[0]!.id, "pfw-hosting-y1");
  assert.equal(document.summary.accountPaymentsReceivedCents, 190_000);
  assert.match(
    document.currentCharges.existingInvoiceNote ?? "",
    /ZQI8LPUG-0002/,
  );
  assert.match(
    document.currentCharges.existingInvoiceNote ?? "",
    /Open invoice/i,
  );
  assert.doesNotMatch(
    document.currentCharges.existingInvoiceNote ?? "",
    /\bcovered\b/i,
  );
  assert.equal(document.paymentHistory.payments.length, 5);
  assert.equal(document.paymentHistory.totalReceivedCents, 190_000);
});

check("H. changing payment evidence changes generated statement totals", () => {
  const base = buildPlatinumFilmWorkzLedgerObligations();
  const before = composePlatinumFilmWorkzStatement20260912({
    obligations: base,
  });
  assert.equal(before.ledger.paidCents, 190_000);

  const updated = base.map((obligation) => {
    if (obligation.id !== "pfw-rem-2") return obligation;
    return {
      ...obligation,
      amountPaidCents: 62_500,
      status: "paid" as const,
      paymentEvents: [
        ...(obligation.paymentEvents ?? []),
        event({
          id: "pe-rem2-extra",
          paymentGroupId: "paygrp-extra",
          amountCents: 60_000,
          paidAt: "2026-09-13T00:00:00.000Z",
        }),
      ],
    };
  });
  const after = composePlatinumFilmWorkzStatement20260912({
    obligations: updated,
  });
  assert.equal(after.ledger.paidCents, 250_000);
  assert.equal(after.ledger.remainingCents, 63_518);
  assert.equal(after.document.summary.projectBalanceCents, 0);
  assert.equal(after.document.summary.totalOutstandingCents, 33_519);
  assert.notEqual(before.ledger.paidCents, after.ledger.paidCents);
});

check("I. statement never uses open invoice existence as paid evidence", () => {
  const obligations = buildPlatinumFilmWorkzLedgerObligations();
  const withOpen = composePlatinumFilmWorkzStatement20260912({
    obligations,
    openInvoice: {
      invoiceNumber: "ZQI8LPUG-0002",
      status: "open",
      amountDueCents: 63_518,
    },
  });
  const withoutOpen = composePlatinumFilmWorkzStatement20260912({
    obligations,
    openInvoice: null,
  });
  assert.equal(withOpen.ledger.paidCents, withoutOpen.ledger.paidCents);
  assert.equal(withOpen.ledger.remainingCents, withoutOpen.ledger.remainingCents);
  assert.equal(withOpen.ledger.paidCents, 190_000);
  assert.ok(withOpen.document.currentCharges.existingInvoiceNote);
  assert.equal(withoutOpen.document.currentCharges.existingInvoiceNote, null);
  const banned = /covered by an existing|already covered|has been paid|marked paid/i;
  assert.doesNotMatch(
    JSON.stringify(withOpen.document),
    banned,
  );
});

check("J. currently due excludes launch-gated hosting; outstanding uses due remaining only", () => {
  const obligations = [
    obl({
      id: "final-open",
      kind: "final",
      label: "Final Payment",
      amountCents: 62_500,
      status: "partially-paid",
      paymentEvents: [
        event({
          id: "pe1",
          paymentGroupId: "g1",
          amountCents: 32_500,
          paidAt: "2026-09-14T00:00:00.000Z",
        }),
      ],
    }),
    obl({
      id: "host",
      kind: "addon",
      label: "Hosting",
      amountCents: 29_999,
      status: "pending-trigger",
      trigger: "website-launch",
    }),
  ];
  const { document } = composeAccountStatement({
    id: "t-j",
    clientName: "Test",
    statementDate: "2026-09-15",
    obligations,
  });
  assert.equal(document.openBalances.items.length, 1);
  assert.equal(document.openBalances.items[0]!.id, "final-open");
  assert.equal(document.openBalances.items[0]!.paidCents, 32_500);
  assert.equal(document.openBalances.items[0]!.remainingCents, 30_000);
  assert.equal(document.openBalances.upcomingItems.length, 1);
  assert.equal(document.openBalances.upcomingItems[0]!.id, "host");
  assert.equal(document.openBalances.totalRemainingCents, 30_000);
  assert.equal(
    document.openBalances.totalRemainingCents,
    document.summary.totalOutstandingCents,
  );
  assert.equal(validateAccountStatement(document).length, 0);
});

check("K. due-state matrix A–I", () => {
  const asOf = "2026-09-15";
  // A due remaining
  const due = composeAccountStatement({
    id: "k-a",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "a",
        kind: "final",
        label: "Due final",
        amountCents: 10_000,
        status: "pending-trigger",
        dueDate: "2026-09-01",
      }),
    ],
  });
  assert.equal(due.document.summary.totalOutstandingCents, 10_000);

  // B partial remaining only
  const partial = composeAccountStatement({
    id: "k-b",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "b",
        kind: "final",
        label: "Partial",
        amountCents: 10_000,
        status: "partially-paid",
        paymentEvents: [
          event({ id: "eb", paymentGroupId: "g", amountCents: 4_000 }),
        ],
      }),
    ],
  });
  assert.equal(partial.document.summary.totalOutstandingCents, 6_000);

  // C paid excluded
  const paid = composeAccountStatement({
    id: "k-c",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "c",
        kind: "final",
        label: "Paid",
        amountCents: 10_000,
        status: "paid",
        amountPaidCents: 10_000,
      }),
    ],
  });
  assert.equal(paid.document.summary.totalOutstandingCents, 0);
  assert.equal(paid.document.openBalances.items.length, 0);

  // D future dated excluded
  const future = composeAccountStatement({
    id: "k-d",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "d",
        kind: "addon",
        label: "Future",
        amountCents: 5_000,
        status: "pending-trigger",
        dueDate: "2026-10-01",
      }),
    ],
  });
  assert.equal(future.document.summary.totalOutstandingCents, 0);
  assert.equal(future.document.openBalances.upcomingItems[0]!.id, "d");

  // E launch-gated pending excluded
  const launch = composeAccountStatement({
    id: "k-e",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "e",
        kind: "addon",
        label: "Hosting",
        amountCents: 29_900,
        status: "pending-trigger",
        trigger: "website-launch",
      }),
    ],
  });
  assert.equal(launch.document.summary.totalOutstandingCents, 0);
  assert.equal(launch.document.openBalances.upcomingItems[0]!.id, "e");

  // F triggered (issued) launch-gated included
  const triggered = composeAccountStatement({
    id: "k-f",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "f",
        kind: "addon",
        label: "Hosting due",
        amountCents: 29_900,
        status: "sent",
        trigger: "website-launch",
      }),
    ],
  });
  assert.equal(triggered.document.summary.totalOutstandingCents, 29_900);

  // G immediate without conventional due date included
  const immediate = composeAccountStatement({
    id: "k-g",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "g",
        kind: "addon",
        label: "Media Vault",
        amountCents: 30_000,
        status: "pending-trigger",
        trigger: "on-date",
        dueDate: "2026-09-15",
      }),
    ],
  });
  assert.equal(immediate.document.summary.totalOutstandingCents, 30_000);

  // H recurring definition not materialized → no obligation → no inflation
  const none = composeAccountStatement({
    id: "k-h",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "h-final",
        kind: "final",
        label: "Final",
        amountCents: 200_000,
        status: "partially-paid",
        paymentEvents: [
          event({ id: "eh", paymentGroupId: "g", amountCents: 0 }),
        ],
        amountPaidCents: 0,
      }),
    ],
  });
  // Partially-paid with 0 events but amountPaidCents 0 and empty effective paid from
  // events array present → Batch A events win at 0; remaining = full amount.
  // For H we only assert no invented recurring row.
  assert.equal(
    none.document.openBalances.items.every((i) => i.kind !== "recurring-period"),
    true,
  );
  assert.equal(none.document.openBalances.upcomingItems.length, 0);

  // I UI/PDF composer parity — same document drives both surfaces
  const parity = composeAccountStatement({
    id: "k-i",
    clientName: "T",
    statementDate: asOf,
    obligations: [
      obl({
        id: "i1",
        kind: "final",
        label: "Final",
        amountCents: 200_000,
        status: "partially-paid",
        paymentEvents: [
          event({ id: "ei", paymentGroupId: "g", amountCents: 0 }),
        ],
      }),
      obl({
        id: "i2",
        kind: "addon",
        label: "Vault",
        amountCents: 30_000,
        status: "pending-trigger",
        dueDate: "2026-09-15",
      }),
      obl({
        id: "i3",
        kind: "addon",
        label: "Hosting",
        amountCents: 29_900,
        status: "pending-trigger",
        trigger: "website-launch",
      }),
    ],
  });
  assert.equal(parity.document.summary.totalOutstandingCents, 230_000);
  assert.equal(parity.document.openBalances.totalRemainingCents, 230_000);
  assert.equal(parity.document.finalPosition.totalCents, 230_000);
  assert.equal(parity.document.openBalances.upcomingItems.length, 1);
  assert.equal(validateAccountStatement(parity.document).length, 0);
});

check("L. client-facing status labels + account-level statement header", () => {
  const { document } = composeAccountStatement({
    id: "t-l",
    clientName: "de Bois Entertainment",
    agreementTitle: "KXD Digital Management & Growth Partnership",
    statementDate: "2026-09-15",
    obligations: [
      obl({
        id: "final",
        kind: "final",
        label: "Website Design & Development — Final Payment",
        amountCents: 300_000,
        status: "partially-paid",
        paymentEvents: [
          event({ id: "pe", paymentGroupId: "g", amountCents: 100_000 }),
        ],
      }),
      obl({
        id: "vault",
        kind: "addon",
        label: "KXD Media Vault — 250 GB",
        amountCents: 30_000,
        status: "pending-trigger",
        dueDate: "2026-09-15",
      }),
      obl({
        id: "host",
        kind: "addon",
        label: "KXD Managed Website Hosting",
        amountCents: 29_900,
        status: "pending-trigger",
        trigger: "website-launch",
      }),
    ],
  });

  assert.equal(document.summary.totalOutstandingCents, 230_000);
  assert.equal(document.documentKindLabel, "Statement type");
  assert.equal(document.documentKindValue, "Account Statement");
  assert.equal(document.agreementTitle, null);

  const vault = document.openBalances.items.find((i) => i.id === "vault");
  const final = document.openBalances.items.find((i) => i.id === "final");
  const host = document.openBalances.upcomingItems.find((i) => i.id === "host");
  assert.ok(vault);
  assert.ok(final);
  assert.ok(host);
  assert.equal(vault!.statusLabel, "Due");
  assert.equal(final!.statusLabel, "Partially Paid");
  assert.equal(host!.statusLabel, "Upcoming");
  assert.equal(host!.timingNote, "Due at website launch");
  assert.doesNotMatch(JSON.stringify(document.openBalances), /Pending Trigger/i);
  assert.doesNotMatch(JSON.stringify(document), /Digital Management & Growth Partnership/);
  assert.equal(validateAccountStatement(document).length, 0);
});

console.log(`\n${passed} checks passed`);
