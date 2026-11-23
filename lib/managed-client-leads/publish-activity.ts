/**
 * Meaningful Activity Engine publications for managed-client inquiries.
 * Primal portal inquiries and paid registrations also publish client-visible notifications.
 */

import { leadDetailHref } from "@/lib/client-command/leads/presentation";
import type { ClientInquiryRecord } from "./types";
import {
  formatRegistrationPaymentAmount,
  registrationPaymentStatusLabel,
  type RegistrationPaymentStatus,
} from "./registration-payment";
import { formatLeadRegistrationProgram } from "@/lib/client-command/leads/registration-presentation";

const PRIMAL_CLIENT_PORTAL_NOTIFICATIONS = new Set(["primal-motorsports"]);

function portalLeadHref(inquiryKey: string): string {
  return leadDetailHref(inquiryKey);
}

function shouldPublishPrimalClientNotification(clientKey: string): boolean {
  return PRIMAL_CLIENT_PORTAL_NOTIFICATIONS.has(clientKey);
}

function inquirySummaryWithoutPii(inquiry: ClientInquiryRecord): string {
  const program =
    formatLeadRegistrationProgram(inquiry) ??
    inquiry.channel?.replaceAll("_", " ") ??
    "inquiry";
  return `New ${program} lead is ready in Lead Command.`;
}

export async function publishClientInquiryReceivedActivity(input: {
  inquiry: ClientInquiryRecord;
  actorUserId?: number | null;
}): Promise<void> {
  const { inquiry } = input;
  const clientVisible = shouldPublishPrimalClientNotification(inquiry.clientKey);
  const href = portalLeadHref(inquiry.inquiryKey);
  const { publishActivity } = await import("@/lib/activity-engine/publish");

  await publishActivity({
    eventType: "managed-client.inquiry.received",
    title: clientVisible ? "New lead received" : "Client inquiry received",
    summary: clientVisible
      ? inquirySummaryWithoutPii(inquiry)
      : `Inquiry ${inquiry.inquiryKey} recorded for follow-up (${inquiry.channel}).`,
    clientId: inquiry.clientId,
    sourceModule: "Client Intelligence",
    sourceType: "client-inquiry",
    sourceId: String(inquiry.id),
    internalOnly: !clientVisible,
    dedupe: true,
    occurredAt: inquiry.receivedAt,
    importance: "normal",
    category: "relationship",
    relatedLinks: clientVisible
      ? [{ label: "Open lead", href }]
      : undefined,
    metadata: {
      inquiryKey: inquiry.inquiryKey,
      clientKey: inquiry.clientKey,
      channel: inquiry.channel,
      reconciliationState: inquiry.reconciliationState,
      hasContactEmail: Boolean(inquiry.contactEmail),
      actorUserId: input.actorUserId ?? null,
      portalNotification: clientVisible,
    },
  });
}

export async function publishClientInquiryRegistrationPaymentActivity(input: {
  inquiry: ClientInquiryRecord;
  paymentStatus: RegistrationPaymentStatus;
  actorUserId?: number | null;
}): Promise<void> {
  const { inquiry } = input;
  const label = registrationPaymentStatusLabel(input.paymentStatus) ?? "Payment update";
  const amount = formatRegistrationPaymentAmount(
    inquiry.paymentAmountCents,
    inquiry.paymentCurrency,
  );
  const program = formatLeadRegistrationProgram(inquiry);
  const clientVisible =
    shouldPublishPrimalClientNotification(inquiry.clientKey) &&
    input.paymentStatus === "paid";
  const href = portalLeadHref(inquiry.inquiryKey);
  const { publishActivity } = await import("@/lib/activity-engine/publish");

  const studioSummary = `Registration ${inquiry.registrationId ?? inquiry.inquiryKey}: ${label}.`;
  const portalSummary = [
    program ? `${program} registration` : "Registration",
    amount ? amount : null,
    label.toLowerCase(),
  ]
    .filter(Boolean)
    .join(" · ");

  await publishActivity({
    eventType: `managed-client.registration.payment.${input.paymentStatus}`,
    title: clientVisible ? "Registration payment confirmed" : label,
    summary: clientVisible ? portalSummary : studioSummary,
    clientId: inquiry.clientId,
    sourceModule: "Client Intelligence",
    sourceType: "client-inquiry",
    sourceId: `${inquiry.id}:payment:${input.paymentStatus}`,
    internalOnly: !clientVisible,
    dedupe: true,
    occurredAt: inquiry.paidAt ?? new Date().toISOString(),
    importance: input.paymentStatus === "payment_exception" ? "high" : "normal",
    category: "relationship",
    relatedLinks: clientVisible
      ? [{ label: "View registration", href }]
      : undefined,
    metadata: {
      inquiryKey: inquiry.inquiryKey,
      clientKey: inquiry.clientKey,
      registrationId: inquiry.registrationId,
      paymentStatus: input.paymentStatus,
      actorUserId: input.actorUserId ?? null,
      portalNotification: clientVisible,
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