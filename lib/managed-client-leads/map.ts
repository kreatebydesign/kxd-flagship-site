/**
 * Map Payload docs ↔ ClientInquiryRecord.
 */

import type {
  OperationalState,
  OutcomeState,
  QualificationState,
  VerificationState,
} from "@/lib/acquisition-operations";
import type { ManagedClientLeadChannel } from "@/lib/acquisition-operations/policy";
import type {
  ClientInquiryRecord,
  Disposition,
  LeadQuality,
  ReconciliationState,
} from "./types";

export function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number") return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

export function mapDocToRecord(doc: Record<string, unknown>): ClientInquiryRecord {
  return {
    id: Number(doc.id),
    inquiryKey: String(doc.inquiryKey ?? ""),
    clientId: relId(doc.client) ?? 0,
    clientKey: String(doc.clientKey ?? ""),
    channel: String(doc.channel ?? "other") as ManagedClientLeadChannel,
    receivedAt: String(doc.receivedAt ?? ""),
    destinationInbox: doc.destinationInbox ? String(doc.destinationInbox) : null,
    landingPage: doc.landingPage ? String(doc.landingPage) : null,
    campaign: doc.campaign ? String(doc.campaign) : null,
    sourceMedium: doc.sourceMedium ? String(doc.sourceMedium) : null,
    contactName: doc.contactName ? String(doc.contactName) : null,
    contactEmail: doc.contactEmail ? String(doc.contactEmail) : null,
    contactPhone: doc.contactPhone ? String(doc.contactPhone) : null,
    messageSummary: doc.messageSummary ? String(doc.messageSummary) : null,
    assignedOwnerId: relId(doc.assignedOwner),
    firstRespondedAt: doc.firstRespondedAt ? String(doc.firstRespondedAt) : null,
    responseTimeSeconds:
      doc.responseTimeSeconds != null && doc.responseTimeSeconds !== ""
        ? Number(doc.responseTimeSeconds)
        : null,
    operationalStatus: String(doc.operationalStatus ?? "new") as OperationalState,
    disposition: String(doc.disposition ?? "none") as Disposition,
    leadQuality: String(doc.leadQuality ?? "unreviewed") as LeadQuality,
    verificationState: String(doc.verificationState ?? "unverified") as VerificationState,
    verifiedAt: doc.verifiedAt ? String(doc.verifiedAt) : null,
    verifiedById: relId(doc.verifiedBy),
    qualificationState: String(
      doc.qualificationState ?? "unreviewed",
    ) as QualificationState,
    outcomeState: String(doc.outcomeState ?? "open") as OutcomeState,
    outcomeNote: doc.outcomeNote ? String(doc.outcomeNote) : null,
    confirmedSaleReference: doc.confirmedSaleReference
      ? String(doc.confirmedSaleReference)
      : null,
    sourceSystem: doc.sourceSystem ? String(doc.sourceSystem) : null,
    sourceExternalId: doc.sourceExternalId ? String(doc.sourceExternalId) : null,
    sourceClientSiteEventId: relId(doc.sourceClientSiteEvent),
    reconciliationState: String(
      doc.reconciliationState ?? "unlinked",
    ) as ReconciliationState,
    googleConversionObserved: Boolean(doc.googleConversionObserved),
    operatorNotes: doc.operatorNotes ? String(doc.operatorNotes) : null,
  };
}
