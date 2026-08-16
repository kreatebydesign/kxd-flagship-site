/**
 * Map CSI website_lead evidence → managed-client inquiry draft fields.
 * Does not persist. Does not confirm sale. Does not create commission.
 *
 * OTP path remains:
 * form → recordWebsiteLead() → email → fail-soft CSI webhook
 * A future operator/service may call receiveManagedClientInquiry with this draft.
 */

import type { WebsiteLeadNormalizedPayload } from "@/lib/client-site-intelligence/types";
import type { ReceiveClientInquiryInput } from "./types";

export type CsiWebsiteLeadEvidence = {
  clientId: number;
  clientKey: string;
  sourceSystem: string;
  externalEventId: string;
  eventRecordId: number;
  occurredAt: string;
  payload: WebsiteLeadNormalizedPayload | Record<string, unknown> | null;
};

function isWebsiteLeadPayload(
  payload: CsiWebsiteLeadEvidence["payload"],
): payload is WebsiteLeadNormalizedPayload {
  return (
    !!payload &&
    typeof payload === "object" &&
    "leadId" in payload &&
    typeof (payload as WebsiteLeadNormalizedPayload).leadId === "string"
  );
}

/**
 * Pure adapter — shared core entry for OTP (and future clients with CSI website_lead).
 */
export function draftInquiryFromCsiWebsiteLead(
  evidence: CsiWebsiteLeadEvidence,
): ReceiveClientInquiryInput {
  const lead = isWebsiteLeadPayload(evidence.payload) ? evidence.payload : null;
  const leadId = lead?.leadId || evidence.externalEventId;
  const leadRecord = lead as Record<string, unknown> | null;
  const message =
    leadRecord && typeof leadRecord.message === "string"
      ? leadRecord.message
      : null;

  return {
    clientId: evidence.clientId,
    clientKey: evidence.clientKey,
    channel: "form",
    receivedAt: evidence.occurredAt,
    sourceSystem: evidence.sourceSystem,
    sourceExternalId: leadId,
    sourceClientSiteEventId: evidence.eventRecordId,
    contactName: lead?.customer?.name ?? null,
    contactEmail: lead?.customer?.email ?? null,
    contactPhone: lead?.customer?.phone ?? null,
    messageSummary: message
      ? String(message).slice(0, 500)
      : lead?.modelInterest || lead?.productInterest
        ? `Interest: ${lead.modelInterest ?? lead.productInterest}`
        : null,
    landingPage:
      lead?.landingPage
        ? String(lead.landingPage).slice(0, 300)
        : lead?.formSource
          ? String(lead.formSource).slice(0, 300)
          : null,
    googleConversionObserved: false,
  };
}

/**
 * Documents the non-negotiable OTP commission boundary for verifiers.
 */
export const OTP_COMMISSION_BOUNDARY = {
  formSubmitCreatesCommission: false,
  csiWebsiteLeadCreatesCommission: false,
  analyticsConversionCreatesCommission: false,
  inquiryCreateCreatesCommission: false,
  qualificationCreatesCommission: false,
  commissionRequiresExplicitCsiSaleConfirmation: true,
  commissionAmountCentsWhenDue: 30_000,
} as const;
