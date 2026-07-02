/**
 * Payload-safe timeline publish for proposal conversion — no server-only.
 */
import type { Payload } from "payload";
import { publishClientActivity } from "@/lib/client-command/activity/publish";
import { publishSalesTimelineEvent } from "@/lib/sales/timeline-events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

export async function publishProposalConvertedEvent(
  input: {
    proposalId: number;
    clientId: number;
    title: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  },
  payload: Payload,
): Promise<void> {
  await publishSalesTimelineEvent(
    {
      eventType: "sales.client-converted",
      clientId: input.clientId,
      proposalId: input.proposalId,
      title: input.title,
      summary: input.summary ?? "Approved proposal converted to client launch.",
      metadata: input.metadata,
    },
    payload,
  );

  await publishClientActivity(
    {
      clientId: input.clientId,
      eventType: "proposal.converted",
      title: input.title,
      summary: input.summary ?? "Proposal converted — client launch initiated.",
      sourceModule: "Growth",
      sourceType: "proposal-conversion",
      sourceId: input.proposalId,
      timestamp: new Date().toISOString(),
      priority: "high",
      metadata: {
        proposalId: input.proposalId,
        ...input.metadata,
      },
    },
    payload,
  );
}

export async function publishLaunchStartedEvent(
  input: {
    clientId: number;
    proposalId: number;
    title: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  },
  payload: Payload,
): Promise<void> {
  await publishClientActivity(
    {
      clientId: input.clientId,
      eventType: "launch.started",
      title: input.title,
      summary: input.summary ?? "Client launch automation started.",
      sourceModule: "Launch",
      sourceType: "proposal-conversion",
      sourceId: input.proposalId,
      timestamp: new Date().toISOString(),
      priority: "high",
      metadata: input.metadata,
    },
    payload,
  );
}

export async function publishLaunchCompletedEvent(
  input: {
    clientId: number;
    proposalId: number;
    title: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  },
  payload: Payload,
): Promise<void> {
  await publishClientActivity(
    {
      clientId: input.clientId,
      eventType: "launch.completed",
      title: input.title,
      summary: input.summary ?? "Client launch automation completed.",
      sourceModule: "Launch",
      sourceType: "proposal-conversion",
      sourceId: input.proposalId,
      timestamp: new Date().toISOString(),
      priority: "normal",
      metadata: input.metadata,
    },
    payload,
  );
}

export async function logProposalConversionActivity(
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
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposal-activity" as any,
    where: {
      and: [
        { proposal: { equals: input.proposalId } },
        { eventType: { equals: input.eventType } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) return;

  await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposal-activity" as any,
    data: {
      proposal: input.proposalId,
      client: input.clientId ?? undefined,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      actor: input.actor ?? "KXD Conversion Engine",
      occurredAt: new Date().toISOString(),
      metadata: input.metadata,
    },
    overrideAccess: true,
  });
}

export function proposalClientId(doc: AnyDoc): number | null {
  return relId(doc.client);
}
