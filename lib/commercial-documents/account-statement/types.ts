/**
 * KXD OS — Account Statement document model.
 *
 * Reusable commercial document shape. Values are integer cents.
 * Presentation never invents tax, fees, due dates, or invoice numbers.
 */

import type { Cents } from "@/lib/proposal-builder/money";

export type AccountStatementMoneyLine = {
  id: string;
  label: string;
  amountCents: Cents;
  detail?: string | null;
};

export type AccountStatementPayment = {
  id: string;
  /** ISO calendar date YYYY-MM-DD */
  paidOn: string;
  amountCents: Cents;
  label: string;
  detail?: string | null;
};

export type AccountStatementServiceCharge = {
  id: string;
  title: string;
  /** Period label, e.g. "September 2026" or "Annual" */
  periodLabel: string;
  amountCents: Cents;
  description?: string | null;
};

export type AccountStatementOpenBalance = {
  id: string;
  description: string;
  originalCents: Cents;
  paidCents: Cents;
  remainingCents: Cents;
  dueDate?: string | null;
  statusLabel: string;
  kind?: string | null;
  /** Present for upcoming / not-yet-due rows. */
  timingNote?: string | null;
};

export type AccountStatementClosingNote = {
  id: string;
  body: string;
};

/**
 * Canonical Account Statement snapshot.
 * Compose from obligations + recorded payments via composeAccountStatement().
 * statementDate is the point-in-time "as of" date for this snapshot.
 */
export type AccountStatementDocument = {
  id: string;
  /** Document title shown to the client */
  title: string;
  clientName: string;
  clientSlug?: string | null;
  /** Primary contact when available — display only. */
  contactName?: string | null;
  /**
   * Account-level document descriptor (UI/PDF header).
   * Prefer this over implying the statement belongs to one agreement.
   */
  documentKindLabel: string;
  documentKindValue: string;
  /**
   * @deprecated Account-level statements leave this null.
   * Retained optional for backward-compatible readers.
   */
  agreementTitle?: string | null;
  /** ISO calendar date YYYY-MM-DD — as-of date for this snapshot */
  statementDate: string;
  currency: "USD";
  summary: {
    originalProjectLabel: string;
    originalProjectCents: Cents;
    paymentsReceivedLabel: string;
    paymentsReceivedCents: Cents;
    projectBalanceLabel: string;
    projectBalanceCents: Cents;
    /**
     * Legacy single-label aggregate for currently-due non-project charges.
     * Prefer `currentChargeLines` for client-facing presentation.
     * When one charge exists, this matches that charge’s label.
     */
    currentChargesLabel: string;
    currentChargesCents: Cents;
    /**
     * Explanatory currently-due non-project charge lines.
     * Sum MUST equal `currentChargesCents`. Never invents new balances —
     * same obligation remainings already counted in openBalances / finalPosition.
     */
    currentChargeLines: AccountStatementMoneyLine[];
    totalOutstandingLabel: string;
    totalOutstandingCents: Cents;
    /** All-account payments received (project + service + addon). */
    accountPaymentsReceivedLabel: string;
    accountPaymentsReceivedCents: Cents;
  };
  openBalances: {
    sectionTitle: string;
    /** Currently due / payable open balances (drives total outstanding). */
    items: AccountStatementOpenBalance[];
    totalRemainingLabel: string;
    totalRemainingCents: Cents;
    /** Contractual remaining that is not yet currently due. */
    upcomingSectionTitle: string;
    upcomingItems: AccountStatementOpenBalance[];
  };
  paymentHistory: {
    sectionTitle: string;
    payments: AccountStatementPayment[];
    totalReceivedLabel: string;
    totalReceivedCents: Cents;
    remainingLabel: string;
    remainingCents: Cents;
  };
  currentCharges: {
    sectionTitle: string;
    items: AccountStatementServiceCharge[];
    subtotalLabel: string;
    subtotalCents: Cents;
    /**
     * Optional issued-invoice context. Must use open/unpaid language
     * unless ledger payment evidence proves settlement. Never "covered".
     */
    existingInvoiceNote?: string | null;
  };
  finalPosition: {
    sectionTitle: string;
    lines: AccountStatementMoneyLine[];
    totalLabel: string;
    totalCents: Cents;
  };
  closingNotes: AccountStatementClosingNote[];
  preparedBy?: string | null;
};
