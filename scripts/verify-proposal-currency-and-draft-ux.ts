/**
 * Focused coverage: currency parsing/display + draft recovery helpers.
 *   npx tsx scripts/verify-proposal-currency-and-draft-ux.ts
 */
import {
  centsToEditableDollars,
  dollarsToCents,
  formatCents,
} from "../lib/proposal-builder/money.ts";
import {
  clearProposalDraftRecovery,
  readProposalDraftRecovery,
  writeProposalDraftRecovery,
} from "../lib/proposal-builder/draft-recovery.ts";
import { emptyProposalDocument } from "../lib/proposal-builder/document.ts";
import { calculateProposalTotals } from "../lib/proposal-builder/pricing.ts";

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

console.log("\nProposal currency + draft UX verification\n");

check("11000 → 1100000 cents", dollarsToCents("11000") === 1_100_000);
check("11000.00 → 1100000 cents", dollarsToCents("11000.00") === 1_100_000);
check("$11,000.00 → 1100000 cents", dollarsToCents("$11,000.00") === 1_100_000);
check("1 → 100 cents", dollarsToCents("1") === 100);
check("1.00 → 100 cents", dollarsToCents("1.00") === 100);
check("1000 → 100000 cents", dollarsToCents("1000") === 100_000);
check("pasted $1,000.00", dollarsToCents("$1,000.00") === 100_000);
check("cents supported", dollarsToCents("11.5") === 1150);
check("display $11,000.00", formatCents(1_100_000) === "$11,000.00");
check("display $1.00", formatCents(100) === "$1.00");
check("display $1,000.00", formatCents(100_000) === "$1,000.00");
check("editable whole dollars", centsToEditableDollars(1_100_000) === "11000");
check("editable with cents", centsToEditableDollars(1150) === "11.50");

// Regression: do not treat whole dollars as cents
check("not off-by-100 for 11000", formatCents(dollarsToCents("11000")) !== "$110.00");
check("not $11.00 for 11000", formatCents(dollarsToCents("11000")) !== "$11.00");
check("not $9.00 for 11000", formatCents(dollarsToCents("11000")) !== "$9.00");

const doc = emptyProposalDocument({
  pricingLines: [
    {
      id: "a",
      title: "Two websites",
      cadence: "one-time",
      quantity: 1,
      unitPriceCents: dollarsToCents("11000"),
      inclusion: "included",
      sortOrder: 1,
    },
    {
      id: "b",
      title: "Monthly",
      cadence: "monthly",
      quantity: 1,
      unitPriceCents: dollarsToCents("1200"),
      inclusion: "included",
      sortOrder: 2,
    },
  ],
  credits: [
    {
      id: "c1",
      kind: "discount",
      label: "Community",
      amountCents: dollarsToCents("3250"),
      appliesTo: "one-time",
    },
    {
      id: "c2",
      kind: "discount",
      label: "Referral",
      amountCents: dollarsToCents("2500"),
      appliesTo: "one-time",
    },
    {
      id: "c3",
      kind: "sponsorship",
      label: "Sponsorship",
      amountCents: dollarsToCents("750"),
      appliesTo: "one-time",
    },
    {
      id: "c4",
      kind: "promotional",
      label: "Monthly partnership",
      amountCents: dollarsToCents("700"),
      appliesTo: "monthly",
    },
  ],
});
const totals = calculateProposalTotals(doc);
check("final one-time $4,500.00", totals.oneTimeTotalCents === 450_000);
check("final monthly $500.00", totals.monthlyTotalCents === 50_000);
check(
  "credits not double-applied",
  totals.oneTimeSubtotalCents === 1_100_000 &&
    totals.creditOneTimeCents === 75_000 &&
    totals.discountOneTimeCents === 575_000,
);

// Local recovery scoping (jsdom-less: only run if localStorage exists)
if (typeof localStorage !== "undefined") {
  writeProposalDraftRecovery({
    version: 1,
    operatorEmail: "demo-operator@localhost.invalid",
    proposalId: "new",
    savedAt: new Date().toISOString(),
    title: "Recovery test",
    leadId: "",
    clientId: "",
    proposalDate: "",
    expiresAt: "",
    internalOwner: "",
    templateKind: "",
    document: emptyProposalDocument(),
  });
  const mine = readProposalDraftRecovery("demo-operator@localhost.invalid", "new");
  const other = readProposalDraftRecovery("other@localhost.invalid", "new");
  check("recovery reads for matching operator", mine?.title === "Recovery test");
  check("recovery hidden from other operator", other === null);
  clearProposalDraftRecovery("demo-operator@localhost.invalid", "new");
  check(
    "recovery cleared after save",
    readProposalDraftRecovery("demo-operator@localhost.invalid", "new") === null,
  );
} else {
  check("recovery helpers exportable", typeof writeProposalDraftRecovery === "function");
  check("recovery read exportable", typeof readProposalDraftRecovery === "function");
  check("recovery clear exportable", typeof clearProposalDraftRecovery === "function");
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
