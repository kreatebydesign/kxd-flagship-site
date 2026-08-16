/**
 * Meaningful Activity Engine publications for managed-client inquiries.
 * Internal-only. No technical ingest noise.
 */

import type { ClientInquiryRecord } from "./types";

export async function publishClientInquiryReceivedActivity(input: {
  inquiry: ClientInquiryRecord;
  actorUserId?: number | null;
}): Promise<void> {
  const { inquiry } = input;
  const { publishActivity } = await import("@/lib/activity-engine/publish");
  await publishActivity({
    eventType: "managed-client.inquiry.received",
    title: "Client inquiry received",
    summary: `Inquiry ${inquiry.inquiryKey} recorded for follow-up (${inquiry.channel}).`,
    clientId: inquiry.clientId,
    sourceModule: "Client Intelligence",
    sourceType: "client-inquiry",
    sourceId: String(inquiry.id),
    internalOnly: true,
    dedupe: true,
    occurredAt: inquiry.receivedAt,
    importance: "normal",
    category: "relationship",
    metadata: {
      inquiryKey: inquiry.inquiryKey,
      clientKey: inquiry.clientKey,
      channel: inquiry.channel,
      reconciliationState: inquiry.reconciliationState,
      // Deliberately omit contact PII.
      hasContactEmail: Boolean(inquiry.contactEmail),
      actorUserId: input.actorUserId ?? null,
    },
  });
}

export async function publishClientInquiryLifecycleActivity(input: {
  inquiry: ClientInquiryRecord;
  eventType: string;
  title: string;
  summary: string;
  actorUserId?: number | null;
}): Promise<void> {
  const { inquiry } = input;
  const { publishActivity } = await import("@/lib/activity-engine/publish");
  await publishActivity({
    eventType: input.eventType,
    title: input.title,
    summary: input.summary,
    clientId: inquiry.clientId,
    sourceModule: "Client Intelligence",
    sourceType: "client-inquiry",
    sourceId: `${inquiry.id}:${input.eventType}`,
    internalOnly: true,
    dedupe: true,
    occurredAt: new Date().toISOString(),
    importance: "normal",
    category: "relationship",
    metadata: {
      inquiryKey: inquiry.inquiryKey,
      clientKey: inquiry.clientKey,
      operationalStatus: inquiry.operationalStatus,
      verificationState: inquiry.verificationState,
      qualificationState: inquiry.qualificationState,
      outcomeState: inquiry.outcomeState,
      actorUserId: input.actorUserId ?? null,
    },
  });
}
