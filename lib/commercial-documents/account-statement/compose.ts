/**
 * Compose AccountStatementDocument from the canonical commercial ledger.
 *
 * Source of truth: contracts.lifecyclePackage.billingPlan.obligations[]
 * via Batch A balance helpers. Open invoices never count as payment.
 *
 * Pure function — no DB writes, no Stripe calls, no persistence of totals.
 */

import { formatCents, type Cents } from "@/lib/proposal-builder/money";
import {
  aggregateObligationBalances,
  isLaunchGatedObligationTrigger,
  isObligationCurrentlyOutstanding,
  obligationAmountPaidCents,
  obligationRemainingCents,
  sumCurrentlyOutstandingCents,
  sumObligationAmountCents,
  sumObligationPaidCents,
  sumOpenObligationRemainingCents,
  sumProjectObligationRemainingCents,
} from "@/lib/proposal-lifecycle/obligation-balances";
import type { InvoiceObligation } from "@/lib/proposal-lifecycle/types";
import { normalizeObligationPaymentHistory } from "./normalize-payment-history";
import type {
  AccountStatementClosingNote,
  AccountStatementDocument,
  AccountStatementMoneyLine,
  AccountStatementOpenBalance,
  AccountStatementPayment,
  AccountStatementServiceCharge,
} from "./types";

export type OpenInvoiceContext = {
  /** Client-visible invoice number, e.g. ZQI8LPUG-0002 */
  invoiceNumber?: string | null;
  /** Stripe invoice id — used for binding only; never treated as payment. */
  stripeInvoiceId?: string | null;
  /** Provider status. "open" / "draft" are unpaid. */
  status: string;
  /** Amount due on the open invoice (integer cents). */
  amountDueCents: number;
  /** Obligation ids this invoice covers (descriptive binding only). */
  obligationIds?: string[];
};

export type ComposeAccountStatementInput = {
  id: string;
  clientName: string;
  clientSlug?: string | null;
  contactName?: string | null;
  agreementTitle?: string | null;
  /** Point-in-time as-of date (YYYY-MM-DD). Snapshot semantics. */
  statementDate: string;
  obligations: InvoiceObligation[];
  currency?: "USD";
  /**
   * Optional open / issued invoice context for wording only.
   * NEVER increases paid totals or marks obligations settled.
   */
  openInvoice?: OpenInvoiceContext | null;
  /** Extra narrative notes (must not invent payment state). */
  closingNotes?: AccountStatementClosingNote[];
  preparedBy?: string | null;
  projectLabel?: string;
  title?: string;
};

export type AccountStatementLedgerTotals = {
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  projectTotalCents: number;
  projectPaidCents: number;
  projectRemainingCents: number;
  openServiceChargesCents: number;
  /** Open invoice amount due when provided; null when absent. */
  openInvoiceAmountDueCents: number | null;
  openInvoiceStatus: string | null;
};

export type ComposeAccountStatementResult = {
  document: AccountStatementDocument;
  ledger: AccountStatementLedgerTotals;
};

function isProjectObligation(obligation: InvoiceObligation): boolean {
  return (
    obligation.kind === "initial" ||
    obligation.kind === "milestone" ||
    obligation.kind === "final"
  );
}

function isOpenInvoiceUnpaid(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "open" ||
    normalized === "draft" ||
    normalized === "uncollectible" ||
    normalized === "past_due" ||
    normalized === "past-due"
  );
}

function formatYearMonth(yyyyMm: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function periodLabelFor(obligation: InvoiceObligation): string {
  if (obligation.billingCadence === "annual") return "Annual";
  if (obligation.dueDate) {
    const fromDue = formatYearMonth(obligation.dueDate.slice(0, 7));
    if (fromDue && obligation.billingCadence === "monthly") return fromDue;
  }
  const fromLabel = obligation.label.match(/—\s*([A-Za-z]+\s+\d{4}|\d{4}-\d{2})$/);
  if (fromLabel?.[1]) {
    const raw = fromLabel[1];
    return formatYearMonth(raw) ?? raw;
  }
  if (obligation.billingCadence === "quarterly") return "Quarterly";
  if (obligation.billingCadence === "monthly") return "Monthly";
  return "Current";
}

function serviceTitleFor(obligation: InvoiceObligation): string {
  return (
    obligation.serviceTitle?.trim() ||
    obligation.label.replace(/\s—\s.*$/, "").trim() ||
    obligation.label
  );
}

function buildOpenInvoiceNote(
  openInvoice: OpenInvoiceContext,
  currency: string,
): string | null {
  // Invoice status alone never proves payment. Only surface open/unpaid wording.
  if (!isOpenInvoiceUnpaid(openInvoice.status)) return null;

  const amount = formatCents(openInvoice.amountDueCents as Cents, currency);
  const number = openInvoice.invoiceNumber?.trim();
  const numberBit = number ? ` (${number})` : "";
  return `Invoice issued${numberBit}. Open invoice — amount due ${amount}. This statement is an account summary — not a new invoice. These charges remain unpaid until payment evidence is recorded on the account ledger.`;
}

function buildPaymentDetail(
  method?: string | null,
  reference?: string | null,
): string | null {
  const parts: string[] = [];
  if (method) parts.push(method);
  if (reference) parts.push(`Ref ${reference}`);
  return parts.length ? parts.join(" · ") : null;
}

function upcomingTimingNote(obligation: InvoiceObligation): string {
  if (isLaunchGatedObligationTrigger(obligation.trigger)) {
    return "Due at website launch";
  }
  if (obligation.dueDate) {
    return `Due ${obligation.dueDate.slice(0, 10)}`;
  }
  return "Not yet due";
}

/**
 * Client-facing balance status for Account Statements.
 * Describes the statement classification — never exposes internal lifecycle
 * labels like "Pending Trigger" on rows already classified as currently due.
 */
export function clientFacingOpenBalanceStatusLabel(
  obligation: InvoiceObligation,
  bucket: "current" | "upcoming",
): string {
  if (bucket === "upcoming") return "Upcoming";
  if (obligation.status === "overdue") return "Past Due";
  const paidCents = obligationAmountPaidCents(obligation);
  const remainingCents = obligationRemainingCents(obligation);
  if (paidCents > 0 && remainingCents > 0) return "Partially Paid";
  return "Due";
}

function toOpenBalanceRow(
  obligation: InvoiceObligation,
  options: { bucket: "current" | "upcoming"; timingNote?: string | null },
): AccountStatementOpenBalance {
  const paidCents = obligationAmountPaidCents(obligation);
  const remainingCents = obligationRemainingCents(obligation);
  return {
    id: obligation.id,
    description: obligation.label,
    originalCents: obligation.amountCents as Cents,
    paidCents: paidCents as Cents,
    remainingCents: remainingCents as Cents,
    dueDate: obligation.dueDate ?? null,
    statusLabel: clientFacingOpenBalanceStatusLabel(obligation, options.bucket),
    kind: obligation.kind,
    timingNote: options.timingNote ?? null,
  };
}

/**
 * Transform ledger obligations (+ optional open-invoice context)
 * into the existing AccountStatementDocument model.
 */
export function composeAccountStatement(
  input: ComposeAccountStatementInput,
): ComposeAccountStatementResult {
  const currency = input.currency ?? "USD";
  const obligations = input.obligations ?? [];
  const asOfDate = input.statementDate;
  const projectObligations = obligations.filter(isProjectObligation);
  const serviceObligations = obligations.filter((o) => !isProjectObligation(o));

  const ledgerAgg = aggregateObligationBalances(obligations);
  const projectTotalCents = sumObligationAmountCents(projectObligations);
  const projectPaidCents = sumObligationPaidCents(projectObligations);
  const projectRemainingCents = sumProjectObligationRemainingCents(obligations);
  const openServiceChargesCents = sumOpenObligationRemainingCents(serviceObligations);

  const openInvoice = input.openInvoice ?? null;
  const openInvoiceAmountDueCents =
    openInvoice && isOpenInvoiceUnpaid(openInvoice.status)
      ? Math.max(0, Math.trunc(openInvoice.amountDueCents) || 0)
      : null;

  const normalizedPayments = normalizeObligationPaymentHistory(obligations);
  const paymentRows: AccountStatementPayment[] = normalizedPayments.map((payment) => ({
    id: payment.id,
    paidOn: payment.paidOn,
    amountCents: payment.amountCents as Cents,
    label: payment.label,
    detail: buildPaymentDetail(payment.method, payment.reference),
  }));
  const paymentsReceivedAllCents = paymentRows.reduce(
    (sum, row) => sum + row.amountCents,
    0,
  );

  const currentlyDueServices = serviceObligations.filter((obligation) =>
    isObligationCurrentlyOutstanding(obligation, asOfDate),
  );
  const currentChargeItems: AccountStatementServiceCharge[] = currentlyDueServices
    .filter((obligation) => obligationRemainingCents(obligation) > 0)
    .map((obligation) => ({
      id: obligation.id,
      title: serviceTitleFor(obligation),
      periodLabel: periodLabelFor(obligation),
      amountCents: obligationRemainingCents(obligation) as Cents,
      description: obligation.serviceDescription?.trim() || null,
    }));

  const currentChargesCents = currentChargeItems.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );

  const openWithRemaining = obligations.filter(
    (obligation) => obligationRemainingCents(obligation) > 0,
  );
  const currentlyDueOpen = openWithRemaining.filter((obligation) =>
    isObligationCurrentlyOutstanding(obligation, asOfDate),
  );
  const upcomingOpen = openWithRemaining.filter(
    (obligation) => !isObligationCurrentlyOutstanding(obligation, asOfDate),
  );

  const openBalanceItems = currentlyDueOpen.map((obligation) =>
    toOpenBalanceRow(obligation, { bucket: "current" }),
  );
  const upcomingBalanceItems = upcomingOpen.map((obligation) =>
    toOpenBalanceRow(obligation, {
      bucket: "upcoming",
      timingNote: upcomingTimingNote(obligation),
    }),
  );

  const totalOutstandingCents = sumCurrentlyOutstandingCents(obligations, asOfDate);

  const finalLines: AccountStatementMoneyLine[] = currentlyDueOpen.map((obligation) => ({
    id: `final-${obligation.id}`,
    label: isProjectObligation(obligation)
      ? obligation.label
      : serviceTitleFor(obligation),
    amountCents: obligationRemainingCents(obligation) as Cents,
  }));

  const closingNotes: AccountStatementClosingNote[] = [...(input.closingNotes ?? [])];
  if (openInvoice && openInvoiceAmountDueCents != null && openInvoiceAmountDueCents > 0) {
    const amount = formatCents(openInvoiceAmountDueCents as Cents, currency);
    const number = openInvoice.invoiceNumber?.trim();
    closingNotes.push({
      id: "note-open-invoice",
      body: number
        ? `Stripe invoice ${number} is open and unpaid for ${amount}. An issued invoice is not payment evidence.`
        : `An open Stripe invoice for ${amount} remains unpaid. An issued invoice is not payment evidence.`,
    });
  }

  const invoiceNote = openInvoice
    ? buildOpenInvoiceNote(openInvoice, currency)
    : null;

  const document: AccountStatementDocument = {
    id: input.id,
    title: input.title ?? "Account Statement",
    clientName: input.clientName,
    clientSlug: input.clientSlug ?? null,
    contactName: input.contactName?.trim() || null,
    /**
     * Account-level statements span all commercial activity for the client.
     * Never imply the document belongs to a single agreement title.
     */
    documentKindLabel: "Statement type",
    documentKindValue: "Account Statement",
    agreementTitle: null,
    statementDate: input.statementDate,
    currency,
    summary: {
      originalProjectLabel:
        input.projectLabel ?? "Original Website Design & Development",
      originalProjectCents: projectTotalCents as Cents,
      paymentsReceivedLabel: "Website Project Payments Received",
      paymentsReceivedCents: projectPaidCents as Cents,
      projectBalanceLabel: "Website Project Balance",
      projectBalanceCents: projectRemainingCents as Cents,
      currentChargesLabel: "Current Service / Infrastructure Charges",
      currentChargesCents: currentChargesCents as Cents,
      totalOutstandingLabel: "Total Currently Outstanding",
      totalOutstandingCents: totalOutstandingCents as Cents,
      accountPaymentsReceivedLabel: "Total Payments Received",
      accountPaymentsReceivedCents: paymentsReceivedAllCents as Cents,
    },
    openBalances: {
      sectionTitle: "Currently Due",
      items: openBalanceItems,
      totalRemainingLabel: "Total currently outstanding",
      totalRemainingCents: totalOutstandingCents as Cents,
      upcomingSectionTitle: "Upcoming / Not Yet Due",
      upcomingItems: upcomingBalanceItems,
    },
    paymentHistory: {
      sectionTitle: "Payment History",
      payments: paymentRows,
      totalReceivedLabel: "Total Payments Received",
      totalReceivedCents: paymentsReceivedAllCents as Cents,
      remainingLabel: "Website project remaining",
      remainingCents: projectRemainingCents as Cents,
    },
    currentCharges: {
      sectionTitle: "Current Services & Infrastructure",
      items: currentChargeItems,
      subtotalLabel: "Current service / infrastructure charges",
      subtotalCents: currentChargesCents as Cents,
      existingInvoiceNote: invoiceNote,
    },
    finalPosition: {
      sectionTitle: "Final Account Position",
      lines: finalLines,
      totalLabel: "Total Currently Outstanding",
      totalCents: totalOutstandingCents as Cents,
    },
    closingNotes,
    preparedBy: input.preparedBy ?? "Kreate by Design",
  };

  return {
    document,
    ledger: {
      totalCents: ledgerAgg.totalCents,
      paidCents: ledgerAgg.paidCents,
      remainingCents: ledgerAgg.remainingCents,
      projectTotalCents,
      projectPaidCents,
      projectRemainingCents,
      openServiceChargesCents,
      openInvoiceAmountDueCents,
      openInvoiceStatus: openInvoice?.status ?? null,
    },
  };
}
