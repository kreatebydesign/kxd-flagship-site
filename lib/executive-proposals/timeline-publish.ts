/**
 * Payload-safe timeline publish — no server-only.
 * Used by Payload hooks and CLI migrate (via payload.config import graph).
 */
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishClientActivity } from "@/lib/client-command/activity/publish";
import { publishSalesTimelineEvent } from "@/lib/sales/timeline-events";
import type { ProposalDoc } from "./types";

const SALES_EVENT_MAP: Partial<
  Record<string, import("@/lib/sales/timeline-events").SalesTimelineEventType>
> = {
  "proposal.sent": "sales.proposal-sent",
  "proposal.viewed": "sales.proposal-viewed",
  "proposal.approved": "sales.proposal-approved",
  "proposal.declined": "sales.proposal-rejected",
  "proposal.expired": "sales.proposal-expired",
  "proposal.created": "sales.proposal-created",
};

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as ProposalDoc).id);
  }
  return null;
}

export async function logProposalActivityRecord(
  payload: Payload,
  input: {
    proposalId: number;
    clientId?: number | null;
    eventType: string;
    title: string;
    summary?: string;
    actor?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposal-activity" as any,
      data: {
        proposal: input.proposalId,
        client: input.clientId ?? undefined,
        eventType: input.eventType,
        title: input.title,
        summary: input.summary,
        actor: input.actor,
        occurredAt: new Date().toISOString(),
        metadata: input.metadata,
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[KXD Proposals] Activity log failed:", err);
  }
}

export async function publishExecutiveProposalEvent(
  doc: ProposalDoc,
  eventType: string,
  payloadInstance?: Payload,
  summary?: string,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const proposalId = doc.id as number;
  const clientId = relId(doc.client);
  const label = String(doc.title ?? doc.proposalNumber ?? proposalId);

  await logProposalActivityRecord(payload, {
    proposalId,
    clientId,
    eventType,
    title: `${eventType.replace("proposal.", "Proposal ")} · ${label}`,
    summary,
    metadata: {
      status: doc.status,
      revisionNumber: doc.revisionNumber,
    },
  });

  if (clientId) {
    try {
      await publishClientActivity(
        {
          clientId,
          sourceModule: "Sales",
          sourceType: "proposal",
          sourceId: `${proposalId}:${eventType}`,
          eventType,
          title: `${eventType.replace("proposal.", "Proposal ")} · ${label}`,
          summary,
          timestamp: new Date().toISOString(),
          status: String(doc.status ?? "draft"),
          metadata: {
            proposalId,
            proposalNumber: doc.proposalNumber,
          },
          relatedLinks: [
            {
              label: "Open proposal",
              href: `/admin/sales/proposals/${proposalId}`,
            },
            {
              label: "Client proposals",
              href: `/admin/operations/client-command/${clientId}?tab=proposals`,
            },
          ],
        },
        payload,
      );
    } catch (err) {
      console.error("[KXD Proposals] Client timeline publish failed:", err);
    }
  }

  const salesEvent = SALES_EVENT_MAP[eventType];
  if (salesEvent) {
    await publishSalesTimelineEvent(
      {
        eventType: salesEvent,
        clientId,
        proposalId,
        title: `${label}`,
        summary,
      },
      payload,
    );
  }
}
