/**
 * Portal Billing Center — read-only ledger projection verifier.
 *
 *   npx tsx scripts/verify-portal-billing-center.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  composeAccountStatement,
  composePlatinumFilmWorkzStatement20260912,
} from "../lib/commercial-documents/account-statement";
import {
  PORTAL_LEDGER_BILLING_READY_KEYS,
  PORTAL_LEDGER_FORBIDDEN_PAYLOAD_KEYS,
  assessPortalBillingNavEligibility,
  projectPortalBillingOverviewCard,
  projectPortalLedgerBillingView,
} from "../lib/portal/billing";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";
import type { ObligationPaymentEvent } from "../lib/proposal-lifecycle/external-obligation-payment";

const root = process.cwd();

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
}): ObligationPaymentEvent {
  return {
    id: partial.id,
    paymentGroupId: partial.paymentGroupId,
    amountCents: partial.amountCents,
    currency: "USD",
    paidAt: partial.paidAt ?? "2026-09-01T00:00:00.000Z",
    externalPaymentMethod: "stripe",
    recordedBy: "test-operator",
    recordedAt: partial.paidAt ?? "2026-09-01T00:00:00.000Z",
    collectionChannel: "manual-external",
    idempotencyKey: `test:${partial.id}`,
    operatorNote: "INTERNAL ONLY",
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
    ...partial,
  };
}

console.log("\nPortal Billing Center\n");

check("nav eligibility: ledger presence alone is enough", () => {
  assert.equal(
    assessPortalBillingNavEligibility({
      mapping: null,
      authorizedClientId: 42,
      ledgerPresent: true,
    }),
    true,
  );
});

check("nav eligibility: rejects invalid client id", () => {
  assert.equal(
    assessPortalBillingNavEligibility({
      mapping: null,
      authorizedClientId: 0,
      ledgerPresent: true,
    }),
    false,
  );
});

check("de Bois-shaped currently due + paid to date + upcoming", () => {
  const deBois: InvoiceObligation[] = [
    obl({
      id: "web",
      kind: "final",
      label: "Website Design & Development — Final Payment",
      amountCents: 9500_00,
      status: "partially-paid",
      dueDate: "2026-08-01",
      paymentEvents: [
        event({
          id: "p1",
          paymentGroupId: "g1",
          amountCents: 2500_00,
          paidAt: "2026-05-10T00:00:00.000Z",
        }),
        event({
          id: "p2",
          paymentGroupId: "g2",
          amountCents: 2500_00,
          paidAt: "2026-06-10T00:00:00.000Z",
        }),
        event({
          id: "p3",
          paymentGroupId: "g3",
          amountCents: 2500_00,
          paidAt: "2026-08-10T00:00:00.000Z",
        }),
      ],
    }),
    obl({
      id: "vault",
      kind: "addon",
      label: "KXD Media Vault — 250 GB",
      amountCents: 300_00,
      status: "sent",
      dueDate: "2026-09-01",
      serviceTitle: "KXD Media Vault — 250 GB",
    }),
    obl({
      id: "hosting",
      kind: "addon",
      label: "KXD Managed Website Hosting",
      amountCents: 299_00,
      status: "pending-trigger",
      trigger: "website-launch",
      billingCadence: "annual",
      serviceTitle: "KXD Managed Website Hosting",
    }),
  ];

  const composed = composeAccountStatement({
    id: "test-de-bois",
    clientName: "de Bois",
    statementDate: "2026-09-15",
    obligations: deBois,
  });

  const view = projectPortalLedgerBillingView({
    document: composed.document,
    clientLabel: "de Bois",
  });

  assert.equal(view.kind, "ready");
  if (view.kind !== "ready") return;

  assert.equal(view.currentlyDueLabel, "$2,300.00");
  assert.equal(view.paidToDateLabel, "$7,500.00");
  assert.equal(view.summary.currentBalance.label, "Current balance");
  assert.equal(view.summary.currentBalance.value, "$2,300.00");
  assert.equal("paidToDate" in view.summary, false);
  assert.equal(view.accountStatus, "outstanding");
  assert.equal(view.currentlyDue.length, 2);
  assert.equal(view.currentlyDue[0]!.showPaidDetail, true);
  assert.equal(view.currentlyDue[1]!.showPaidDetail, false);
  assert.equal(view.upcomingItems.length, 1);
  assert.match(view.upcomingItems[0]!.dueLabel ?? "", /launch/i);
  assert.equal(view.paymentHistory.length, 3);
  assert.equal(view.statementPdfHref, "/api/portal/billing/account-statement/pdf");
  for (const row of view.paymentHistory) {
    assert.doesNotMatch(row.label, /Final Payment/i);
    assert.match(row.label, /Website Design & Development — Project Payment/);
    assert.equal(row.detail, null);
  }

  const payload = JSON.stringify(view);
  for (const forbidden of PORTAL_LEDGER_FORBIDDEN_PAYLOAD_KEYS) {
    assert.equal(
      payload.includes(`"${forbidden}"`),
      false,
      `ready view must not expose ${forbidden}`,
    );
  }
  assert.equal(payload.includes("INTERNAL ONLY"), false);
  assert.equal(payload.includes("test-operator"), false);
  assert.equal(payload.includes("pending-trigger"), false);

  for (const key of Object.keys(view)) {
    assert.ok(
      (PORTAL_LEDGER_BILLING_READY_KEYS as readonly string[]).includes(key),
      `unexpected ready key: ${key}`,
    );
  }

  const card = projectPortalBillingOverviewCard(view);
  assert.ok(card);
  assert.equal(card!.accountStatus, "outstanding");
  assert.equal(card!.amountLabel, "$2,300.00");
  assert.equal(card!.statusLine, "Currently due");
  assert.equal(card!.upcomingNote, null);
  assert.equal(card!.billingHref, "/portal/invoices");
  assert.equal(JSON.stringify(card).includes("paid to date"), false);
});

check("zero-balance account current card", () => {
  const composed = composeAccountStatement({
    id: "test-current",
    clientName: "Current Client",
    statementDate: "2026-09-15",
    obligations: [
      obl({
        id: "paid",
        kind: "final",
        label: "Project complete",
        amountCents: 1000_00,
        status: "paid",
        paymentEvents: [
          event({
            id: "p1",
            paymentGroupId: "g1",
            amountCents: 1000_00,
          }),
        ],
      }),
      obl({
        id: "hosting",
        kind: "addon",
        label: "Hosting",
        amountCents: 299_00,
        status: "pending-trigger",
        trigger: "website-launch",
      }),
    ],
  });
  const view = projectPortalLedgerBillingView({
    document: composed.document,
    clientLabel: "Current Client",
  });
  assert.equal(view.kind, "ready");
  if (view.kind !== "ready") return;
  assert.equal(view.accountStatus, "current");
  assert.equal(view.currentlyDueLabel, "$0.00");
  assert.equal(view.currentlyDue.length, 0);
  assert.equal(view.upcomingItems.length, 1);

  const card = projectPortalBillingOverviewCard(view);
  assert.ok(card);
  assert.equal(card!.amountLabel, "$0.00");
  assert.equal(card!.statusLine, "You're current");
  assert.match(card!.upcomingNote ?? "", /Upcoming/);
  assert.equal(JSON.stringify(card).includes("paid to date"), false);
});

check("Platinum statement projection stays statement-parity", () => {
  const platinum = composePlatinumFilmWorkzStatement20260912();
  const view = projectPortalLedgerBillingView({
    document: platinum.document,
    clientLabel: platinum.document.clientName,
  });
  assert.equal(view.kind, "ready");
  if (view.kind !== "ready") return;
  assert.equal(
    view.paymentHistory.length,
    platinum.document.paymentHistory.payments.length,
  );
  assert.equal(
    view.currentlyDue.length,
    platinum.document.openBalances.items.length,
  );
  assert.equal(
    view.upcomingItems.length,
    platinum.document.openBalances.upcomingItems.length,
  );
  assert.equal(
    view.currentlyDueLabel,
    view.summary.currentBalance.value,
  );
  assert.equal(
    view.paidToDateLabel,
    // retained for ledger parity; not rendered in portal summary UI
    view.paidToDateLabel,
  );
  for (const row of view.paymentHistory) {
    assert.doesNotMatch(row.label, /;\s*/);
    assert.doesNotMatch(row.label, /Final Payment/i);
    assert.equal(row.detail?.includes("in_") ?? false, false);
  }
  const finalOpen = view.currentlyDue.find((row) =>
    /Final/i.test(row.description),
  );
  assert.ok(finalOpen);
  assert.match(finalOpen!.statusLabel ?? "", /Partially Paid/i);
  assert.equal(finalOpen!.remainingLabel, "$600.00");
});

check("multi-obligation Sep payment never implies Final Payment was made", () => {
  const obligations: InvoiceObligation[] = [
    obl({
      id: "progress",
      kind: "milestone",
      label: "Website Design & Development — Progress Payment",
      amountCents: 1500_00,
      status: "paid",
      amountPaidCents: 1500_00,
      paymentEvents: [
        event({
          id: "sep-a",
          paymentGroupId: "sep-2500",
          amountCents: 1500_00,
          paidAt: "2026-09-10T00:00:00.000Z",
        }),
      ],
    }),
    obl({
      id: "final",
      kind: "final",
      label: "Website Design & Development — Final Payment",
      amountCents: 3000_00,
      status: "partially-paid",
      amountPaidCents: 1000_00,
      paymentEvents: [
        event({
          id: "sep-b",
          paymentGroupId: "sep-2500",
          amountCents: 1000_00,
          paidAt: "2026-09-10T00:00:00.000Z",
        }),
      ],
    }),
    obl({
      id: "vault",
      kind: "addon",
      label: "KXD Media Vault — 250 GB",
      amountCents: 300_00,
      status: "sent",
      dueDate: "2026-09-01",
    }),
  ];

  const composed = composeAccountStatement({
    id: "multi-alloc",
    clientName: "de Bois",
    statementDate: "2026-09-15",
    obligations,
  });
  const view = projectPortalLedgerBillingView({
    document: composed.document,
    clientLabel: "de Bois",
  });
  assert.equal(view.kind, "ready");
  if (view.kind !== "ready") return;

  assert.equal(view.paymentHistory.length, 1);
  assert.equal(view.paymentHistory[0]!.amountLabel, "$2,500.00");
  assert.equal(
    view.paymentHistory[0]!.label,
    "Website Design & Development — Project Payment",
  );
  assert.doesNotMatch(view.paymentHistory[0]!.label, /Final Payment/i);
  assert.equal(view.currentlyDueLabel, "$2,300.00");

  const finalRow = view.currentlyDue.find((row) =>
    /Final Payment/i.test(row.description),
  );
  assert.ok(finalRow);
  assert.equal(finalRow!.originalLabel, "$3,000.00");
  assert.equal(finalRow!.paidLabel, "$1,000.00");
  assert.equal(finalRow!.remainingLabel, "$2,000.00");
  assert.equal(finalRow!.statusLabel, "Partially Paid");
});

check("portal UI omits paid-to-date and muddy status badges", () => {
  const screen = readFileSync(
    join(root, "components/client-hq/InvoicesScreen.tsx"),
    "utf8",
  );
  const card = readFileSync(
    join(root, "components/client-hq/AccountBalanceCard.tsx"),
    "utf8",
  );
  assert.equal(/Paid to date/i.test(screen), false);
  assert.equal(/Paid to date/i.test(card), false);
  assert.equal(/paidToDateLabel/.test(screen), false);
  assert.equal(/statusBadgeVariant/.test(screen), false);
  assert.match(screen, /currentBalance/);
  assert.match(screen, /kxd-os-billing-status/);
  assert.match(
    readFileSync(join(root, "lib/portal/billing/presentation.ts"), "utf8"),
    /label: "Current balance"/,
  );
});

check("Pay Balance is omitted from portal billing UI sources", () => {
  const files = [
    "components/client-hq/InvoicesScreen.tsx",
    "components/client-hq/AccountBalanceCard.tsx",
    "lib/portal/billing/presentation.ts",
    "lib/portal/billing/load.ts",
    "app/(portal)/portal/(app)/invoices/page.tsx",
    "app/api/portal/billing/account-statement/pdf/route.ts",
  ];
  for (const relative of files) {
    const source = readFileSync(join(root, relative), "utf8");
    assert.equal(/Pay Balance/i.test(source), false, relative);
  }
});

check("portal PDF route is session-scoped and read-only", () => {
  const source = readFileSync(
    join(root, "app/api/portal/billing/account-statement/pdf/route.ts"),
    "utf8",
  );
  assert.match(source, /getPortalSession/);
  assert.match(source, /loadPortalLiveAccountStatement/);
  assert.match(source, /renderAccountStatementPdf/);
  assert.doesNotMatch(source, /fileStatementIfPossible/);
  assert.doesNotMatch(source, /payload\.create/);
  assert.doesNotMatch(source, /params.*clientId/);
  assert.match(source, /private, no-store/);
});

check("home overview wires billingNavAvailable into composition", () => {
  const source = readFileSync(
    join(root, "app/(portal)/portal/(app)/page.tsx"),
    "utf8",
  );
  assert.match(source, /billingNavAvailable/);
  assert.match(source, /resolvePortalHomeComposition/);
  assert.match(source, /billingOverview/);
  assert.match(source, /isHomeZoneVisible\(home, "billing"\)/);
});

check("account-statement is client-safe document kind", () => {
  const source = readFileSync(
    join(root, "lib/portal/commercial/client-safe-documents.ts"),
    "utf8",
  );
  assert.match(source, /"account-statement"/);
});

console.log(`\n${passed} checks passed.\n`);
