/**
 * Universal Proposal → Acceptance → Contract → Dual E-Sign → Billing lifecycle.
 * Extends existing proposal-builder + contracts — does not replace them.
 *
 * Storage: contracts.lifecyclePackage (JSONB) + existing proposal/contract fields.
 * Stripe: mock / test-mode drafts only. No live send/charge/activate in this module.
 */

import type { Cents } from "../proposal-builder/money.ts";
import type {
  AcceptanceRecord,
  CanonicalContractDraft,
  CanonicalProposal,
  PricingTotals,
} from "../proposal-builder/types.ts";

/** Human-facing progression labels (UI). Internal DB statuses remain proposal-builder enums. */
export const HUMAN_PROGRESSION = [
  "Draft",
  "Sent",
  "Viewed",
  "Accepted — Contract Required",
  "Contract Drafted",
  "Internal Review",
  "KXD Signed",
  "Sent for Client Signature",
  "Client Viewed",
  "Client Signed",
  "Fully Executed",
  "Billing Plan Ready",
  "Initial Invoice Review",
  "Invoice Sent",
  "Initial Payment Received",
  "Ready for Onboarding",
] as const;

export type HumanProgression = (typeof HUMAN_PROGRESSION)[number];

export const BILLING_PLAN_STATUSES = [
  "pending-contract-execution",
  "preparing",
  "blocked",
  "ready-for-review",
  "approved",
  "partially-activated",
  "active",
  "completed",
  "cancelled",
] as const;

export type BillingPlanStatus = (typeof BILLING_PLAN_STATUSES)[number];

export const INVOICE_READINESS_STATUSES = [
  "incomplete",
  "conflict-detected",
  "ready-for-review",
  "approved-for-stripe-preparation",
  "stripe-draft-created",
  "approved-for-send",
  "sent",
] as const;

export type InvoiceReadinessStatus = (typeof INVOICE_READINESS_STATUSES)[number];

export const INVOICE_OBLIGATION_STATUSES = [
  "pending-trigger",
  "draft-ready",
  "under-review",
  "approved",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "void",
  "uncollectible",
] as const;

export type InvoiceObligationStatus = (typeof INVOICE_OBLIGATION_STATUSES)[number];

export const RECURRING_SCHEDULE_STATUSES = [
  "pending-trigger",
  "ready-for-review",
  "approved-pending-start",
  "active",
  "paused",
  "cancelled",
  "completed",
] as const;

export type RecurringScheduleStatus = (typeof RECURRING_SCHEDULE_STATUSES)[number];

export type ReadinessSeverity = "blocker" | "warning" | "info";

export interface ReadinessIssue {
  code: string;
  severity: ReadinessSeverity;
  field: string;
  message: string;
  source?: string;
}

export interface LocalDeliveryPreview {
  id: string;
  mode: "local-simulated";
  label:
    | "SIMULATED LOCAL DELIVERY — not sent"
    | "CLIENT SIGNING LINK PREPARED — no email sent";
  kind:
    | "proposal-send"
    | "proposal-reminder"
    | "proposal-expiration"
    | "proposal-acceptance-confirmation"
    | "contract-signature-send"
    | "contract-reminder"
    | "contract-execution-confirmation"
    | "billing-preparation-notice"
    | "payment-confirmation"
    | "onboarding-eligible-operator"
    | "invoice-send";
  templateVersion?: string | null;
  createdAt: string;
  createdBy?: string | null;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  secureUrl: string;
  relatedProposalId?: number | null;
  relatedContractId?: number | null;
  version?: number | null;
  snapshotHash?: string | null;
}

export interface TypedSignatureEvidence {
  legalName: string;
  title: string;
  entityName: string;
  email: string;
  typedAcknowledgment: string;
  authorityConfirmed: boolean;
  electronicRecordsConsent: boolean;
  consentDisclosureVersion: string;
  consentText: string;
  signedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  actorRole: "kxd-operator" | "client";
  documentHash: string;
  signatureHash: string;
}

export type CommercialTermsSource = "proposal" | "direct-agreement";

export interface StructuredPaymentTerms {
  schemaVersion: 1;
  currency: string;
  oneTimeTotalCents: Cents;
  monthlyTotalCents: Cents;
  depositCents: Cents;
  initialPayment: {
    type: "deposit" | "full" | "none";
    amountCents: Cents;
    trigger: "at-acceptance" | "at-contract" | "on-date" | "manual";
    dueTerms: string;
  };
  installments: Array<{
    id: string;
    label: string;
    amountCents: Cents;
    trigger: string;
    dueTerms: string;
    status: InvoiceObligationStatus;
    dueDate?: string | null;
    group?: "initial-deposit" | "remaining" | "other";
    notes?: string;
  }>;
  recurring: {
    amountCents: Cents;
    cadence: "monthly" | "quarterly" | "annual" | "none";
    startTrigger: string;
    minimumTermMonths: number | null;
    renewalBehavior: string;
    status: RecurringScheduleStatus;
    /** Explicit operator confirmation required when pending. */
    startBillingDate?: string | null;
    startBillingDateStatus?:
      | "confirmed"
      | "pending-confirmation"
      | "milestone-confirmed"
      | "not-applicable";
    serviceTitle?: string | null;
    includes?: string[];
    excludes?: string[];
    rankingDisclaimer?: string | null;
    commencementNotes?: string | null;
  };
  /** Ancillary charges (domain, hosting) — never part of oneTimeTotalCents. */
  ancillaryCharges?: Array<{
    id: string;
    kind: string;
    title: string;
    amountCents: Cents;
    cadence: "one-time" | "annual";
    dueTrigger: string;
    dueDate?: string | null;
    termNotes: string;
    renewalNotes?: string | null;
    status: InvoiceObligationStatus;
  }>;
  credits: Array<{ label: string; amountCents: Cents; appliesTo: string }>;
  taxes: { treatment: "unspecified" | "exclusive" | "inclusive" | "exempt"; notes: string };
  billingContactName?: string;
  billingEmail?: string;
  payerLegalName?: string;
  brandName?: string;
  /** Discriminator — proposal snapshot vs Direct Agreement fields. */
  commercialSource?: CommercialTermsSource;
  sourceProposalNumber: string;
  sourceProposalVersion: number;
  sourceAcceptanceHash?: string;
  derivedAt: string;
}

export interface InvoiceObligation {
  id: string;
  kind: "initial" | "milestone" | "final" | "recurring-period" | "addon";
  label: string;
  amountCents: Cents;
  currency: string;
  trigger: string;
  dueTerms: string;
  status: InvoiceObligationStatus;
  /** Optional calendar due date (YYYY-MM-DD) when schedule is date-based. */
  dueDate?: string | null;
  stripeDraftInvoiceId?: string | null;
  paidAt?: string | null;
  contractSection?: string;
  /** How funds were collected — never invent Stripe collection. */
  collectionChannel?:
    | "stripe-invoice-external-pay"
    | "manual-external"
    | "stripe-collected"
    | null;
  /** External payment receipt (Cash App, etc.) when paid outside Stripe collection. */
  paymentReceipt?: import("./external-obligation-payment.ts").ObligationPaymentReceipt | null;
}

export interface RecurringSchedule {
  id: string;
  amountCents: Cents;
  currency: string;
  cadence: "monthly" | "quarterly" | "annual";
  startTrigger: string;
  minimumTermMonths: number | null;
  status: RecurringScheduleStatus;
  stripeScheduleOrSubscriptionId?: string | null;
  firstBillingDate?: string | null;
}

export interface ProposedBillingPlan {
  schemaVersion: 1;
  id: string;
  status: BillingPlanStatus;
  invoiceReadiness: InvoiceReadinessStatus;
  contractId: number;
  proposalId: number;
  proposalNumber: string;
  contractVersion: number;
  contractHash: string;
  currency: string;
  oneTimeTotalCents: Cents;
  monthlyTotalCents: Cents;
  obligations: InvoiceObligation[];
  recurring: RecurringSchedule | null;
  issues: ReadinessIssue[];
  reconciliation: {
    contractOneTimeCents: Cents;
    obligationsSumCents: Cents;
    differenceCents: Cents;
    creditsAppliedOnce: boolean;
  };
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  mockStripe?: {
    customerId?: string | null;
    draftInvoiceIds: string[];
    inactiveScheduleId?: string | null;
  };
}

export interface ExecutionCertificate {
  agreementId: string;
  proposalId: number;
  proposalNumber: string;
  proposalVersion: number;
  contractId: number;
  contractVersion: number;
  documentHash: string;
  kxdSignerName: string;
  kxdSignedAt: string;
  clientSignerName: string;
  clientSignedAt: string;
  consentVersion: string;
  verificationId: string;
  sealedAt: string;
  /** When acceptance was recorded externally (not e-sign). */
  acceptanceMode?: "electronic-signature" | "external-acceptance";
}

export interface ContractLifecyclePackage {
  schemaVersion: 1;
  structuredPaymentTerms?: StructuredPaymentTerms | null;
  billingReadinessIssues?: ReadinessIssue[];
  /** Reviewed client billing identity overrides (local/fixture). */
  clientBillingIdentity?: {
    legalName?: string | null;
    billingEmail?: string | null;
    billingAddress?: string | null;
    taxTreatment?: "unspecified" | "exclusive" | "inclusive" | "exempt" | null;
    billingAddressPresent?: boolean;
  } | null;
  operatorSignature?: TypedSignatureEvidence | null;
  clientSignature?: TypedSignatureEvidence | null;
  signingTokenHash?: string | null;
  signingTokenPrefix?: string | null;
  signingTokenExpiresAt?: string | null;
  signingTokenRevokedAt?: string | null;
  /** One-time completion download token hash after execution (hashed at rest). */
  completionTokenHash?: string | null;
  completionTokenPrefix?: string | null;
  completionTokenExpiresAt?: string | null;
  sentForSignatureAt?: string | null;
  sentForSignatureBy?: string | null;
  clientViewedAt?: string | null;
  executedCertificate?: ExecutionCertificate | null;
  billingPlan?: ProposedBillingPlan | null;
  /** Controlled Stripe TEST MODE state — never store live objects here. */
  stripeTest?: import("./stripe-test/invoice-logic.ts").LifecycleStripeTestState | null;
  deliveryPreviews?: LocalDeliveryPreview[];
  auditEvents?: LifecycleAuditEvent[];
  onboardingEligible?: boolean;
  onboardingEligibleAt?: string | null;
  /**
   * Commercial → Client Launch Handoff V0 state (JSON on lifecycle package).
   * No schema migration — operator bridge only.
   */
  launchHandoff?: {
    draftId?: string | number | null;
    launchedClientId?: number | null;
    launchedAt?: string | null;
    invitationIds?: number[];
    lastInvitationOutcomes?: Array<{
      email: string;
      role: string;
      invitationId: number | null;
      status: string;
      emailSent: boolean;
      message: string;
    }>;
  } | null;
  /** Filed commercial document IDs (idempotent). */
  documentRefs?: Array<{
    id: number;
    kind: string;
    contentHash: string;
    version: number;
    generatedAt: string;
  }>;
  /** Deduped mock webhook event IDs. */
  processedWebhookEventIds?: string[];
  voidReason?: string | null;
  supersededByContractId?: number | null;
  lineageParentContractId?: number | null;
  /** Direct Agreement commercial progression (not e-sign status). */
  commercialStatus?:
    | "draft"
    | "finalized"
    | "sent"
    | "accepted"
    | "payment-pending"
    | "paid"
    | "active"
    | "completed"
    | "cancelled"
    | null;
  commercialSource?: CommercialTermsSource | null;
  termsFinalizedAt?: string | null;
  termsLockedHash?: string | null;
  /** Externally recorded acceptance — never fabricated e-sign. */
  externalAcceptance?: import("../direct-agreement/types.ts").ExternalAcceptanceRecord | null;
  /** Payment authorization metadata — Stripe IDs / brand / last4 only. */
  paymentAuthorization?: import("../direct-agreement/types.ts").PaymentAuthorizationRecord | null;
  paymentReferences?: import("../direct-agreement/types.ts").DirectAgreementPaymentReferences | null;
  /**
   * Post-acceptance commercial amendments applied to this contract only.
   * Never rewrite proposal.acceptedSnapshot.
   */
  commercialAmendments?: import("./commercial-amendments.ts").ContractCommercialAmendments | null;
  /**
   * Deterministic Stripe invoice bindings before/alongside billing plan.
   * Used so live invoices can be matched without fuzzy email/amount matching.
   */
  obligationStripeBindings?: import("./live-stripe-reconciliation.ts").ObligationStripeBinding[] | null;
  /**
   * Verified live Stripe payments received before billing plan / execution.
   * Applied onto obligations when the billing plan exists; eligibility still requires execution.
   */
  pendingVerifiedStripePayments?: import("./live-stripe-reconciliation.ts").PendingVerifiedStripePayment[] | null;
}

export interface LifecycleAuditEvent {
  id: string;
  at: string;
  actor?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  sourceVersion?: number | null;
  correlationId?: string | null;
}

export interface EnhancedAcceptanceInput {
  name: string;
  title: string;
  organization: string;
  email: string;
  authorityConfirmed: boolean;
  reviewedConfirmed: boolean;
  /** Typed acknowledgment — must match legal name. */
  typedAcknowledgment: string;
  selectedLineIds?: string[];
  selectedPackageKeys?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export type AcceptanceRecordV2 = AcceptanceRecord & {
  typedAcknowledgment?: string;
  disclosureText?: string;
  disclosureVersion?: string;
  contractRequiredDisclosure?: string;
  evidenceRecordId?: string;
  correlationId?: string | null;
  snapshotHash?: string;
};

export interface LifecycleContextSummary {
  proposalId: number;
  proposalNumber: string;
  proposalStatus: string;
  contractId: number | null;
  contractStatus: string | null;
  humanProgression: HumanProgression;
  acceptance: AcceptanceRecordV2 | null;
  draft: CanonicalContractDraft | null;
  package: ContractLifecyclePackage;
  canonical: CanonicalProposal | null;
  totals: PricingTotals | null;
}
