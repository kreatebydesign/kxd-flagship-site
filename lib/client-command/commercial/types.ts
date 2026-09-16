/**
 * Operator-facing Commercial workspace view models.
 * Relational views over contracts, documents, lifecycle, billing — no Payload collection UI.
 */

export const COMMERCIAL_SECTIONS = [
  "overview",
  "proposals",
  "agreements",
  "invoices",
  "payments",
  "receipts",
  "statements",
  "authorizations",
  "documents",
  "timeline",
] as const;

export type CommercialSectionId = (typeof COMMERCIAL_SECTIONS)[number];

export type CommercialDocumentKindLabel =
  | "Agreement"
  | "Proposal"
  | "Invoice"
  | "Receipt"
  | "Account statement"
  | "Authorization evidence"
  | "Billing summary"
  | "Execution certificate"
  | "Package"
  | "Document";

export interface CommercialDocumentRow {
  id: number;
  kind: string;
  kindLabel: CommercialDocumentKindLabel;
  title: string;
  status: string;
  version: number;
  generatedAt: string | null;
  contractId: number | null;
  agreementTitle: string | null;
  downloadHref: string;
  previewHref: string;
}

export interface CommercialAgreementRow {
  id: number;
  title: string;
  status: string;
  statusLabel: string;
  typeLabel: string;
  sourceLabel: string;
  valueLabel: string;
  projectAmountCents: number | null;
  monthlyAmountCents: number | null;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  createdAt: string | null;
  acceptedAt: string | null;
  href: string;
  proposalId: number | null;
}

export interface CommercialPaymentRow {
  id: string;
  agreementId: number | null;
  agreementTitle: string | null;
  amountLabel: string;
  paymentStatus: string;
  stripeCustomerId: string | null;
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  receiptUrl: string | null;
  hostedInvoiceUrl: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  linkedAt: string | null;
  source: string | null;
  livemode: boolean | null;
  paidAt: string | null;
  operatorNote: string | null;
  idempotencyKey: string | null;
}

/** Agreements eligible for Record External Payment from Commercial → Payments. */
export interface CommercialExternalPaymentEligibleAgreement {
  agreementId: number;
  title: string;
  commercialStatus: string;
  obligationAmountCents: number;
  currency: string;
  href: string;
  /** When true, agreement-level settlement is blocked — use obligation Record Payment. */
  blocksAgreementLevelSettlement: boolean;
  openObligationCount: number;
}

export interface CommercialAuthorizationRow {
  id: string;
  agreementId: number;
  agreementTitle: string;
  authorizedBy: string;
  method: string;
  authorizedAt: string | null;
  amountLabel: string;
  notes: string | null;
  relatedPaymentStatus: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

export interface CommercialPaymentEventRow {
  id: string;
  paymentGroupId: string;
  amountLabel: string;
  paidAt: string;
  method: string;
  externalReference: string | null;
  operatorNote: string | null;
  obligationLabel: string;
}

export interface CommercialInvoiceRow {
  id: string;
  title: string;
  /** Original obligation amount display. */
  amountLabel: string;
  /** Amount already applied. */
  amountPaidLabel: string;
  /** Remaining balance display. */
  remainingLabel: string;
  amountCents: number;
  amountPaidCents: number;
  remainingCents: number;
  status: string;
  statusLabel: string;
  date: string | null;
  dueDate: string | null;
  triggerLabel: string | null;
  agreementId: number | null;
  agreementTitle: string | null;
  obligationId: string | null;
  kind: string | null;
  stripeInvoiceId: string | null;
  hostedInvoiceUrl: string | null;
  source: "obligation" | "payment-reference" | "workspace-invoice";
  canRecordPayment: boolean;
  paymentHistory: CommercialPaymentEventRow[];
  /** Client-facing recurring service includes text (optional). */
  serviceDescription: string | null;
  /** Operator-only. Never for portal/invoice presentation. */
  internalNotes: string | null;
}

export interface CommercialReceiptRow {
  id: string;
  title: string;
  amountLabel: string;
  date: string | null;
  agreementId: number | null;
  agreementTitle: string | null;
  receiptUrl: string | null;
  stripeChargeId: string | null;
}

export interface CommercialTimelineRow {
  id: string;
  occurredAt: string;
  title: string;
  summary: string;
  eventType: string;
  href: string | null;
}

export interface CommercialOverviewSnapshot {
  agreementTitle: string | null;
  agreementId: number | null;
  agreementHref: string | null;
  statusLabel: string;
  paymentStatusLabel: string;
  /** KPI label for agreement commercial amount (Invoice amount vs Monthly rate). */
  commercialAmountLabel: string;
  /** KPI value for agreement commercial amount. */
  invoiceAmountLabel: string;
  /** Project / one-time contracted amount (not annualized LTV). */
  projectContractedLabel: string;
  /** Recurring monthly rate (MRR) — not currently due. */
  recurringMrrLabel: string;
  /** Sum of open obligation remaining balances (due / collectible now). */
  dueNowLabel: string;
  /** Sum already paid across obligations. */
  paidToDateLabel: string;
  /** Remaining project installment balance only. */
  remainingProjectLabel: string;
  termStart: string | null;
  termEnd: string | null;
  hoursIncludedLabel: string;
  hoursUsedLabel: string;
  hoursRemainingLabel: string;
  paymentMethodLabel: string;
  renewalLabel: string;
  lastActivityLabel: string | null;
  outstandingItems: string[];
  documentKindsPresent: CommercialDocumentKindLabel[];
}

export interface CommercialObligationPaymentTarget {
  agreementId: number;
  agreementTitle: string;
  currency: string;
  openObligationCount: number;
  openRemainingCents: number;
  href: string;
}

/** Recurring service templates available for registering a due period occurrence. */
export interface CommercialRecurringServiceTarget {
  agreementId: number;
  agreementTitle: string;
  currency: string;
  serviceKey: string;
  serviceTitle: string;
  amountCents: number;
  cadence: "monthly" | "quarterly" | "annual";
  billDay: number;
  effectiveDate: string | null;
  href: string;
  /** True when amount/title differ from accepted structured terms (operator commercial service). */
  isOperatorDefined: boolean;
  /** True when loaded from persisted operatorRecurringServices (reuse without retyping). */
  isPersistedDefinition: boolean;
  sourceLabel: string;
  /** Client-facing includes description. Optional. */
  serviceDescription: string | null;
  /** Operator-only notes. Optional. */
  internalNotes: string | null;
}

export interface CommercialStatementOpenBalanceRow {
  id: string;
  description: string;
  originalLabel: string;
  paidLabel: string;
  remainingLabel: string;
  dueDate: string | null;
  statusLabel: string;
  timingNote?: string | null;
}

export interface CommercialStatementPaymentRow {
  id: string;
  paidOn: string;
  label: string;
  detail: string | null;
  amountLabel: string;
}

export interface CommercialStatementSnapshot {
  statementDate: string;
  clientName: string;
  contactName: string | null;
  agreementTitle: string | null;
  currency: "USD";
  summary: {
    originalProjectLabel: string;
    originalProjectValue: string;
    accountPaymentsReceivedLabel: string;
    accountPaymentsReceivedValue: string;
    projectBalanceLabel: string;
    projectBalanceValue: string;
    currentChargesLabel: string;
    currentChargesValue: string;
    totalOutstandingLabel: string;
    totalOutstandingValue: string;
  };
  openBalances: CommercialStatementOpenBalanceRow[];
  upcomingBalances: CommercialStatementOpenBalanceRow[];
  payments: CommercialStatementPaymentRow[];
  totalOutstandingCents: number;
  pdfHref: string;
}

export interface ClientCommercialWorkspaceSnapshot {
  clientId: number;
  overview: CommercialOverviewSnapshot;
  agreements: CommercialAgreementRow[];
  documents: CommercialDocumentRow[];
  payments: CommercialPaymentRow[];
  authorizations: CommercialAuthorizationRow[];
  invoices: CommercialInvoiceRow[];
  receipts: CommercialReceiptRow[];
  timeline: CommercialTimelineRow[];
  /** Live current account statement derived from ledger obligations. */
  statement: CommercialStatementSnapshot | null;
  primaryAgreementId: number | null;
  externalPaymentEligibleAgreements: CommercialExternalPaymentEligibleAgreement[];
  /** Agreements with open billing-plan obligations eligible for obligation-level Record Payment. */
  obligationPaymentTargets: CommercialObligationPaymentTarget[];
  recurringServiceTargets: CommercialRecurringServiceTarget[];
}
