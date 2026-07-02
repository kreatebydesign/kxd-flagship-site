/**
 * Payload-safe revenue event publish — no server-only.
 */
import type { Payload } from "payload";
import { publishClientActivity } from "@/lib/client-command/activity/publish";
import type { RevenueEventType } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

export interface PublishRevenueEventInput {
  eventType: RevenueEventType | string;
  title: string;
  summary?: string;
  amount?: number | null;
  clientId?: number | null;
  proposalId?: number | null;
  contractId?: number | null;
  retainerId?: number | null;
  projectId?: number | null;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}

export async function publishRevenueEvent(
  input: PublishRevenueEventInput,
  payload: Payload,
): Promise<void> {
  if (input.eventType !== "financial.snapshot.created") {
    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "revenue-events" as any,
      where: { dedupeKey: { equals: input.dedupeKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) return;

    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "revenue-events" as any,
      data: {
        client: input.clientId ?? undefined,
        proposal: input.proposalId ?? undefined,
        contract: input.contractId ?? undefined,
        retainer: input.retainerId ?? undefined,
        project: input.projectId ?? undefined,
        eventType: input.eventType,
        title: input.title,
        summary: input.summary,
        amount: input.amount ?? undefined,
        occurredAt: new Date().toISOString(),
        dedupeKey: input.dedupeKey,
        metadata: input.metadata,
      },
      overrideAccess: true,
    });
  }

  if (input.clientId) {
    const timelineType =
      input.eventType === "financial.snapshot.created"
        ? "financial.snapshot.created"
        : input.eventType;

    await publishClientActivity(
      {
        clientId: input.clientId,
        eventType: timelineType,
        title: input.title,
        summary: input.summary,
        sourceModule: "Growth",
        sourceType: "financial-command",
        sourceId: input.dedupeKey,
        timestamp: new Date().toISOString(),
        priority:
          input.eventType === "revenue.at-risk" || input.eventType === "billing.setup-missing"
            ? "high"
            : "normal",
        metadata: {
          amount: input.amount,
          ...input.metadata,
        },
      },
      payload,
    );
  }
}

export async function publishFinancialSnapshotCreated(
  input: {
    clientId?: number | null;
    snapshotType: string;
    periodLabel: string;
    metrics: Record<string, unknown>;
  },
  payload: Payload,
): Promise<void> {
  const dedupeKey = `snapshot:${input.snapshotType}:${input.periodLabel}:${input.clientId ?? "executive"}`;

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "financial-snapshots" as any,
    where: {
      and: [
        { snapshotType: { equals: input.snapshotType } },
        { periodLabel: { equals: input.periodLabel } },
        input.clientId
          ? { client: { equals: input.clientId } }
          : { client: { exists: false } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "financial-snapshots" as any,
      id: (existing.docs[0] as AnyDoc).id,
      data: {
        metrics: input.metrics,
        generatedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
  } else {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "financial-snapshots" as any,
      data: {
        snapshotType: input.snapshotType,
        client: input.clientId ?? undefined,
        periodLabel: input.periodLabel,
        generatedAt: new Date().toISOString(),
        metrics: input.metrics,
      },
      overrideAccess: true,
    });
  }

  if (input.clientId) {
    await publishRevenueEvent(
      {
        eventType: "financial.snapshot.created",
        title: `Financial snapshot · ${input.periodLabel}`,
        summary: `${input.snapshotType} snapshot updated.`,
        clientId: input.clientId,
        dedupeKey: `timeline:${dedupeKey}`,
        metadata: { snapshotType: input.snapshotType },
      },
      payload,
    );
  }
}

export { relId };
