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

export interface CommercialInvoiceRow {
  id: string;
  title: string;
  amountLabel: string;
  status: string;
  date: string | null;
  agreementId: number | null;
  agreementTitle: string | null;
  stripeInvoiceId: string | null;
  hostedInvoiceUrl: string | null;
  source: "obligation" | "payment-reference" | "workspace-invoice";
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
  invoiceAmountLabel: string;
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
  primaryAgreementId: number | null;
  externalPaymentEligibleAgreements: CommercialExternalPaymentEligibleAgreement[];
}
