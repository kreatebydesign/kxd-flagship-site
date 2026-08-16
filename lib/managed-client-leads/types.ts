/**
 * Managed Client Lead Operations — shared domain types (Phase 2).
 */

import type {
  OperationalState,
  OutcomeState,
  QualificationState,
  VerificationState,
} from "@/lib/acquisition-operations";
import type { ManagedClientLeadChannel } from "@/lib/acquisition-operations/policy";

export type ReconciliationState =
  | "unlinked"
  | "matched"
  | "ads_without_inquiry"
  | "inquiry_without_ads"
  | "not_applicable";

export type LeadQuality =
  | "unreviewed"
  | "high"
  | "medium"
  | "low"
  | "spam";

export type Disposition =
  | "none"
  | "contacted"
  | "nurturing"
  | "appointment_set"
  | "not_interested"
  | "unable_to_reach"
  | "spam"
  | "other";

export type ClientInquiryRecord = {
  id: number;
  inquiryKey: string;
  clientId: number;
  clientKey: string;
  channel: ManagedClientLeadChannel;
  receivedAt: string;
  destinationInbox: string | null;
  landingPage: string | null;
  campaign: string | null;
  sourceMedium: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  messageSummary: string | null;
  assignedOwnerId: number | null;
  firstRespondedAt: string | null;
  responseTimeSeconds: number | null;
  operationalStatus: OperationalState;
  disposition: Disposition;
  leadQuality: LeadQuality;
  verificationState: VerificationState;
  verifiedAt: string | null;
  verifiedById: number | null;
  qualificationState: QualificationState;
  outcomeState: OutcomeState;
  outcomeNote: string | null;
  confirmedSaleReference: string | null;
  sourceSystem: string | null;
  sourceExternalId: string | null;
  sourceClientSiteEventId: number | null;
  reconciliationState: ReconciliationState;
  googleConversionObserved: boolean;
  operatorNotes: string | null;
};

export type ReceiveClientInquiryInput = {
  clientId: number;
  clientKey: string;
  channel: ManagedClientLeadChannel;
  receivedAt?: string;
  destinationInbox?: string | null;
  landingPage?: string | null;
  campaign?: string | null;
  sourceMedium?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  messageSummary?: string | null;
  sourceSystem?: string | null;
  sourceExternalId?: string | null;
  sourceClientSiteEventId?: number | null;
  googleConversionObserved?: boolean;
  inquiryKey?: string;
  operatorNotes?: string | null;
  actorUserId?: number | null;
};

export type ClientLeadLedgerSnapshot = {
  clientId: number;
  clientKey: string;
  policyEnabled: boolean;
  policyDisplayName: string | null;
  attributionReconciliationEnabled: boolean;
  ga4PropertyIds: string[];
  commissionOnConfirmedSale: boolean;
  commissionAmountCents: number | null;
  portalModuleEnabled: boolean;
  inquiries: ClientInquiryRecord[];
  counts: {
    total: number;
    new: number;
    unverified: number;
    qualified: number;
    matched: number;
    inquiryWithoutAds: number;
    adsWithoutInquiry: number;
  };
};
