/**
 * Payload-safe publish path — usable from hooks and server routes.
 */
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import type { ExecutiveTimelineSourceModule } from "@/lib/executive-timeline/types";
import {
  buildActivityDedupeKey,
  categoryForEventType,
  defaultImportanceForEventType,
  timelineStatusForActivity,
} from "./rules";
import type { PublishActivityInput, PublishActivityResult } from "./types";

const COLLECTION = "executive-timeline-events";

function asSourceModule(module: string): ExecutiveTimelineSourceModule {
  return module as ExecutiveTimelineSourceModule;
}

function readMeta(doc: Record<string, unknown>): Record<string, unknown> {
  const meta = doc.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

async function findExistingActivity(
  clientId: number,
  eventType: string,
  dedupeKey: string,
  sourceId: string | number | undefined,
  payload: Payload,
): Promise<number | null> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [{ client: { equals: clientId } }, { eventType: { equals: eventType } }],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of result.docs) {
    const row = doc as Record<string, unknown>;
    const meta = readMeta(row);
    if (meta.dedupeKey === dedupeKey) return row.id as number;
    if (
      sourceId != null &&
      meta.sourceId != null &&
      String(meta.sourceId) === String(sourceId) &&
      meta.dedupeKey == null
    ) {
      return row.id as number;
    }
  }

  return null;
}

function buildMetadata(
  input: PublishActivityInput,
  dedupeKey: string | undefined,
): Record<string, unknown> {
  return {
    activityEngine: true,
    sourceModule: input.sourceModule,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    dedupeKey,
    author: input.author,
    workId: input.workId ?? undefined,
    reviewId: input.reviewId ?? undefined,
    relatedLinks: input.relatedLinks,
    attachments: input.attachments,
    ...input.metadata,
  };
}

/**
 * Canonical Activity Engine publish — sole recommended ingress for executive events.
 *
 * When `clientId` is present, writes to `executive-timeline-events` (relationship memory).
 * Without a client, skips persistence (timeline requires a client today) and returns a clear reason.
 * Future modules can subscribe to this API without touching Payload.
 */
export async function publishActivity(
  input: PublishActivityInput,
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  const clientId =
    input.clientId != null && Number.isFinite(Number(input.clientId))
      ? Number(input.clientId)
      : null;

  if (clientId == null) {
    return {
      created: false,
      skipped: true,
      reason: "client-required",
    };
  }

  const payload = payloadInstance ?? (await getPayload({ config }));
  const shouldDedupe = input.dedupe ?? input.sourceId != null;
  const dedupeKey =
    shouldDedupe && input.sourceId != null
      ? buildActivityDedupeKey(input.sourceId, input.eventType)
      : undefined;

  if (shouldDedupe && dedupeKey) {
    const existingId = await findExistingActivity(
      clientId,
      input.eventType,
      dedupeKey,
      input.sourceId,
      payload,
    );
    if (existingId) {
      return { created: false, skipped: true, id: existingId, dedupeKey };
    }
  }

  const category = input.category ?? categoryForEventType(input.eventType);
  const importance = defaultImportanceForEventType(input.eventType, input.importance);
  const status = timelineStatusForActivity(input.eventType, input.status);

  const event = await createExecutiveEvent(
    {
      client: clientId,
      project: input.projectId ?? undefined,
      infrastructure: input.infrastructureId ?? undefined,
      request: input.requestId ?? undefined,
      deliverable: input.deliverableId ?? undefined,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      description: input.description ?? input.summary,
      category,
      status,
      importance,
      sourceModule: asSourceModule(input.sourceModule),
      createdBy: input.author,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      metadata: buildMetadata(input, dedupeKey),
      internalOnly: input.internalOnly ?? true,
      pinned: input.pinned ?? false,
    },
    payload,
  );

  return {
    created: true,
    skipped: false,
    id: event.id as number,
    dedupeKey,
  };
}
