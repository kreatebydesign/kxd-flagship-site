/**
 * KXD Proposal Builder — canonical types.
 * Operational / draft language only. Not attorney-approved legal copy.
 */

import type { Cents } from "./money.ts";

export const PROPOSAL_BUILDER_STATUSES = [
  "draft",
  "internal-review",
  "approved-for-sharing",
  "sent",
  "viewed",
  "questions",
  "revision-requested",
  "accepted-contract-pending",
  "approved",
  "declined",
  "rejected",
  "expired",
  "archived",
] as const;

export type ProposalBuilderStatus = (typeof PROPOSAL_BUILDER_STATUSES)[number];

export const CONTRACT_BUILDER_STATUSES = [
  "draft",
  "internal-review",
  "approved-for-signature",
  "sent",
  "sent-for-signature",
  "viewed",
  "partially-signed",
  "signed",
  "executed",
  "declined",
  "expired",
  "voided",
  "superseded",
  "archived",
] as const;

export type ContractBuilderStatus = (typeof CONTRACT_BUILDER_STATUSES)[number];

export const ACCEPTANCE_MODES = [
  "accept-and-proceed-to-contract",
  "binding-proposal-future",
] as const;

export type AcceptanceMode = (typeof ACCEPTANCE_MODES)[number];

export const PROPOSAL_TEMPLATE_KINDS = [
  "website-design-development",
  "monthly-website-management",
  "marketing-advertising-management",
  "combined-project-retainer",
  "sponsorship-trade-partnership",
  "custom-professional-services",
] as const;

export type ProposalTemplateKind = (typeof PROPOSAL_TEMPLATE_KINDS)[number];

export type BillingCadence = "one-time" | "monthly" | "quarterly" | "annual";

export type LineInclusion = "included" | "optional" | "excluded";

export type CreditKind =
  | "sponsorship"
  | "trade-barter"
  | "promotional"
  | "custom"
  | "discount";

export type OptionSelectionMode =
  | "recommended-package"
  | "mutually-exclusive"
  | "base-plus-addons"
  | "custom-combination";

export interface ProposalOrganization {
  id: string;
  name: string;
  brand?: string;
  role?: string;
}

export interface ProposalContact {
  id: string;
  name: string;
  email?: string;
  /** Optional; U.S. display `(###) ###-####` or international as entered. */
  phone?: string;
  title?: string;
  organizationId?: string;
  isPrimary?: boolean;
}

export interface ProposalDeliverable {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
}

export interface ProposalScopeGroup {
  id: string;
  organizationId?: string;
  organizationName?: string;
  title: string;
  overview?: string;
  deliverables: ProposalDeliverable[];
  milestones?: string;
  dependencies?: string;
  clientResponsibilities?: string;
  kxdResponsibilities?: string;
  assumptions?: string;
  exclusions?: string;
  estimatedTimeline?: string;
  sortOrder: number;
  inclusion: LineInclusion;
}

export interface ProposalPricingLine {
  id: string;
  scopeGroupId?: string;
  organizationId?: string;
  title: string;
  description?: string;
  cadence: BillingCadence;
  quantity: number;
  unitPriceCents: Cents;
  inclusion: LineInclusion;
  packageKey?: string;
  isAddon?: boolean;
  sortOrder: number;
}

export interface ProposalCredit {
  id: string;
  kind: CreditKind;
  label: string;
  amountCents: Cents;
  appliesTo: "one-time" | "monthly" | "annual" | "all";
  notes?: string;
}

export interface PaymentScheduleItem {
  id: string;
  label: string;
  amountCents: Cents;
  due: "at-acceptance" | "at-contract" | "milestone" | "on-date" | "remaining";
  dueDate?: string | null;
  milestoneLabel?: string;
  sortOrder: number;
}

export interface ProposalOptionsConfig {
  mode: OptionSelectionMode;
  clientCanSelect: boolean;
  recommendedPackageKey?: string;
  packages: Array<{
    key: string;
    title: string;
    description?: string;
    mutuallyExclusive?: boolean;
  }>;
}

export interface ProposalTermsDocument {
  proposalTerms?: string;
  paymentAssumptions?: string;
  timelineAssumptions?: string;
  expirationLanguage?: string;
  changeRequestLanguage?: string;
  intellectualPropertySummary?: string;
  cancellationSummary?: string;
  clientResponsibilities?: string;
  exclusions?: string;
  nextSteps?: string;
  closingNote?: string;
  acceptanceDisclosure?: string;
  contractRequiredDisclosure?: string;
  /** Marked as operational draft — not attorney-approved. */
  operationalDraftNotice?: string;
}

export interface ProposalExecutiveContent {
  executiveSummary?: string;
  currentSituation?: string;
  objectives?: string;
  recommendedDirection?: string;
  desiredOutcomes?: string;
  clientContext?: string;
  clientFacingIntro?: string;
}

export interface ProposalInternalFields {
  internalNotes?: string;
  internalCostNotes?: string;
  marginNotes?: string;
  internalOwner?: string;
}

export interface ProposalDocument {
  schemaVersion: 1;
  organizations: ProposalOrganization[];
  contacts: ProposalContact[];
  executive: ProposalExecutiveContent;
  scopeGroups: ProposalScopeGroup[];
  pricingLines: ProposalPricingLine[];
  credits: ProposalCredit[];
  paymentSchedule: PaymentScheduleItem[];
  options: ProposalOptionsConfig;
  terms: ProposalTermsDocument;
  internal: ProposalInternalFields;
  currency: string;
  taxRateBps: number;
  depositCents: Cents;
  scheduleCallUrl?: string;
  templateKind?: ProposalTemplateKind | null;
}

export interface PricingTotals {
  currency: string;
  oneTimeSubtotalCents: Cents;
  monthlySubtotalCents: Cents;
  quarterlySubtotalCents: Cents;
  annualSubtotalCents: Cents;
  optionalOneTimeCents: Cents;
  optionalMonthlyCents: Cents;
  creditOneTimeCents: Cents;
  creditMonthlyCents: Cents;
  discountOneTimeCents: Cents;
  taxCents: Cents;
  oneTimeTotalCents: Cents;
  monthlyTotalCents: Cents;
  quarterlyTotalCents: Cents;
  annualTotalCents: Cents;
  dueAtAcceptanceCents: Cents;
  dueAtContractCents: Cents;
  remainingBalanceCents: Cents;
  depositCents: Cents;
  selectedLineIds: string[];
  selectedPackageKeys: string[];
}

export interface CanonicalProposal {
  schemaVersion: 1;
  proposalId: number;
  proposalNumber: string;
  title: string;
  version: number;
  status: ProposalBuilderStatus;
  acceptanceMode: AcceptanceMode;
  proposalDate: string | null;
  expirationDate: string | null;
  preparedBy: string;
  primaryOrganization: string;
  organizations: ProposalOrganization[];
  primaryContact: ProposalContact | null;
  additionalContacts: ProposalContact[];
  executive: ProposalExecutiveContent;
  scopeGroups: ProposalScopeGroup[];
  pricingLines: ProposalPricingLine[];
  credits: ProposalCredit[];
  paymentSchedule: PaymentScheduleItem[];
  options: ProposalOptionsConfig;
  terms: ProposalTermsDocument;
  totals: PricingTotals;
  selectedLineIds: string[];
  selectedPackageKeys: string[];
  currency: string;
  disclosures: {
    acceptance: string;
    contractRequired: string;
    operationalDraft: string;
  };
}

export interface ProposalVersionRecord {
  version: number;
  notes?: string;
  createdAt: string;
  createdBy?: string | null;
  approvedForSharingAt?: string | null;
  supersededAt?: string | null;
  snapshot?: CanonicalProposal | null;
}

export interface AcceptanceRecord {
  acceptedAt: string;
  version: number;
  name: string;
  title: string;
  organization: string;
  email: string;
  authorityConfirmed: boolean;
  reviewedConfirmed: boolean;
  /** Typed legal-name acknowledgment (not a decorative canvas). */
  typedAcknowledgment?: string;
  acceptanceDisclosureVersion?: string;
  acceptanceDisclosureText?: string;
  contractRequiredDisclosureText?: string;
  correlationId?: string | null;
  selectedLineIds: string[];
  selectedPackageKeys: string[];
  totals: PricingTotals;
  shareLinkId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  acceptanceHash: string;
}

export interface ChangeRequestRecord {
  id: string;
  submittedAt: string;
  name: string;
  email: string;
  organization?: string;
  message: string;
  sectionReference?: string;
  shareLinkId?: string | null;
}

export interface ShareLinkRecord {
  id: string;
  tokenHash: string;
  tokenPrefix: string;
  version: number;
  createdAt: string;
  createdBy?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  viewCount: number;
}

export interface ContractLegalProvisions {
  termAndTermination?: string;
  paymentDefault?: string;
  intellectualProperty?: string;
  portfolioPublicity?: string;
  confidentiality?: string;
  warrantiesDisclaimers?: string;
  limitationOfLiability?: string;
  indemnity?: string;
  independentContractor?: string;
  forceMajeure?: string;
  disputeResolution?: string;
  governingLaw?: string;
  entireAgreement?: string;
  amendments?: string;
  electronicSignatures?: string;
  counterparts?: string;
  /** Always shown — not attorney-approved. */
  draftNotice: string;
}

export interface CanonicalContractDraft {
  schemaVersion: 1;
  contractId?: number;
  proposalId: number;
  proposalNumber: string;
  proposalVersion: number;
  title: string;
  status: ContractBuilderStatus;
  parties: {
    clientName: string;
    organizations: string[];
    kxdName: string;
    primaryContactName?: string;
    primaryContactTitle?: string;
    primaryContactEmail?: string;
    primaryContactPhone?: string;
  };
  scopeSummary: string;
  deliverables: string[];
  scheduleSummary: string;
  pricingSummary: string;
  recurringSummary: string;
  creditsSummary: string;
  depositSummary: string;
  paymentScheduleSummary: string;
  responsibilities: string;
  assumptions: string;
  exclusions: string;
  changeProcess: string;
  legal: ContractLegalProvisions;
  body: string;
  totals: PricingTotals;
  generatedAt: string;
}

export const DEFAULT_ACCEPTANCE_DISCLOSURE =
  "If you approve this proposal, Kreate by Design will prepare the final agreement based on the accepted scope, pricing, and options. Approving this proposal is not a signed contract.";

export const DEFAULT_CONTRACT_REQUIRED_DISCLOSURE =
  "Work begins after the final agreement is signed and the initial payment is received.";

export const DEFAULT_OPERATIONAL_DRAFT_NOTICE =
  "Template and operational wording only. Not attorney-approved legal advice. Matt must review all contract language before sharing or signature.";

export const DEFAULT_LEGAL_DRAFT_NOTICE =
  "DRAFT FOR INTERNAL REVIEW — Not attorney-approved. Do not send, share, or treat as executed until explicitly approved and signed through the contract workflow.";
