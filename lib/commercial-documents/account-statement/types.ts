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
  /** Optional commercial relationship / agreement title. */
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
    currentChargesLabel: string;
    currentChargesCents: Cents;
    totalOutstandingLabel: string;
    totalOutstandingCents: Cents;
    /** All-account payments received (project + service + addon). */
    accountPaymentsReceivedLabel: string;
    accountPaymentsReceivedCents: Cents;
  };
  openBalances: {
    sectionTitle: string;
    items: AccountStatementOpenBalance[];
    totalRemainingLabel: string;
    totalRemainingCents: Cents;
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
