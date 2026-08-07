/**
 * Internal Activity Engine publication for Client Site Intelligence events.
 * Relationship memory only — default internalOnly. No client-facing notifications.
 */

import type { Payload } from "payload";
import {
  buildWebsiteLeadActivitySourceId,
  CSI_ACTIVITY_SOURCE_MODULE,
  CSI_ACTIVITY_SOURCE_TYPE,
  CSI_WEBSITE_LEAD_ACTIVITY_EVENT_TYPE,
} from "./constants";
import type { ClientSiteEventRecord, WebsiteLeadNormalizedPayload } from "./types";

export interface PublishCsiActivityResult {
  published: boolean;
  skipped: boolean;
  activityId: number | null;
}

function isWebsiteLeadPayload(
  payload: ClientSiteEventRecord["payload"],
): payload is WebsiteLeadNormalizedPayload {
  return (
    !!payload &&
    typeof payload === "object" &&
    "leadId" in payload &&
    typeof (payload as WebsiteLeadNormalizedPayload).leadId === "string"
  );
}

/**
 * Publish internal-only activity for a newly persisted (or replay-completing) website lead.
 * Title/summary avoid unnecessary customer PII.
 */
export async function publishWebsiteLeadActivity(input: {
  record: ClientSiteEventRecord;
  payloadInstance?: Payload;
}): Promise<PublishCsiActivityResult> {
  const { record } = input;
  const sourceId = buildWebsiteLeadActivitySourceId({
    sourceSystem: record.sourceSystem,
    externalEventId: record.externalEventId,
    eventClass: record.eventClass,
    eventRecordId: record.id,
  });

  const lead = isWebsiteLeadPayload(record.payload) ? record.payload : null;
  const interest =
    lead?.modelInterest || lead?.productInterest
      ? ` Interest: ${lead.modelInterest ?? lead.productInterest}.`
      : "";

  // Lazy import avoids pulling Payload/@payload-config into CLI verifiers.
  const { publishActivity } = await import("@/lib/activity-engine/publish");
  const result = await publishActivity(
    {
      eventType: CSI_WEBSITE_LEAD_ACTIVITY_EVENT_TYPE,
      title: "Website lead received",
      summary: `OTP Carts website lead ${record.externalEventId}.${interest} Internal attribution record only — commission not due.`.trim(),
      clientId: record.clientId,
      sourceModule: CSI_ACTIVITY_SOURCE_MODULE,
      sourceType: CSI_ACTIVITY_SOURCE_TYPE,
      sourceId,
      internalOnly: true,
      dedupe: true,
      occurredAt: record.occurredAt,
      importance: "normal",
      category: "website",
      metadata: {
        clientSiteEventId: record.id,
        clientKey: record.clientKey,
        eventClass: record.eventClass,
        externalEventId: record.externalEventId,
        sourceSystem: record.sourceSystem,
        // Deliberately omit customer email/phone/message from activity metadata.
        hasCustomerEmail: Boolean(lead?.customer.email),
        modelInterest: lead?.modelInterest ?? null,
        formSource: lead?.formSource ?? null,
      },
    },
    input.payloadInstance,
  );

  return {
    published: result.created,
    skipped: result.skipped,
    activityId: result.id ?? null,
  };
}
