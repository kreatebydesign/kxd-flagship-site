/**
 * Sales timeline events — Payload-safe (no server-only).
 */
import type { Payload } from "payload";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import { createAutomationEvent } from "@/lib/automation/engine";

export type SalesTimelineEventType =
  | "sales.proposal-created"
  | "sales.proposal-sent"
  | "sales.proposal-viewed"
  | "sales.agreement-signed"
  | "sales.deposit-paid"
  | "sales.proposal-approved"
  | "sales.proposal-rejected"
  | "sales.proposal-expired"
  | "sales.client-converted"
  | "sales.retainer-activated"
  | "sales.project-created";

const EVENT_META: Record<
  SalesTimelineEventType,
  { title: string; category: "relationship" | "finance" | "project" | "growth"; importance: "normal" | "high" }
> = {
  "sales.proposal-created": { title: "Proposal created", category: "relationship", importance: "normal" },
  "sales.proposal-sent": { title: "Proposal sent", category: "relationship", importance: "normal" },
  "sales.proposal-viewed": { title: "Proposal viewed", category: "relationship", importance: "normal" },
  "sales.agreement-signed": { title: "Agreement signed", category: "relationship", importance: "high" },
  "sales.deposit-paid": { title: "Deposit paid", category: "finance", importance: "high" },
  "sales.proposal-approved": { title: "Proposal approved", category: "relationship", importance: "high" },
  "sales.proposal-rejected": { title: "Proposal declined", category: "relationship", importance: "normal" },
  "sales.proposal-expired": { title: "Proposal expired", category: "relationship", importance: "normal" },
  "sales.client-converted": { title: "Client converted", category: "growth", importance: "high" },
  "sales.retainer-activated": { title: "Retainer activated", category: "finance", importance: "high" },
  "sales.project-created": { title: "Project created", category: "project", importance: "high" },
};

export async function publishSalesTimelineEvent(
  input: {
    eventType: SalesTimelineEventType;
    clientId?: number | null;
    title?: string;
    summary?: string;
    proposalId?: number;
    metadata?: Record<string, unknown>;
  },
  payload?: Payload,
): Promise<void> {
  const meta = EVENT_META[input.eventType];

  if (input.clientId) {
    try {
      await createExecutiveEvent(
        {
          client: input.clientId,
          eventType: input.eventType,
          title: input.title ?? meta.title,
          summary: input.summary,
          category: meta.category,
          importance: meta.importance,
          sourceModule: "Growth",
          metadata: { proposalId: input.proposalId, ...input.metadata },
        },
        payload,
      );
    } catch (err) {
      console.error("[KXD Sales] Executive timeline publish failed:", err);
    }
  }

  try {
    await createAutomationEvent(
      {
        module: "Growth",
        eventName: input.eventType,
        clientId: input.clientId ?? undefined,
        payload: {
          title: input.title ?? meta.title,
          summary: input.summary,
          proposalId: input.proposalId,
          ...input.metadata,
        },
        skipRules: input.eventType === "sales.proposal-viewed",
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Sales] Automation event publish failed:", err);
  }
}

export async function logSalesActivityRecord(
  payload: Payload,
  input: {
    activityType: string;
    title: string;
    summary?: string;
    leadId?: number;
    proposalId?: number;
    clientId?: number;
  },
): Promise<void> {
  try {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-activities" as any,
      data: {
        activityType: input.activityType,
        title: input.title,
        summary: input.summary,
        lead: input.leadId,
        proposal: input.proposalId,
        client: input.clientId,
        occurredAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[KXD Sales] Activity log failed:", err);
  }
}
