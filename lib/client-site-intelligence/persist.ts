/**
 * Client Site Event Registry persistence — canonical ingest store.
 * Idempotent on sourceSystem + externalEventId + eventClass (DB unique index).
 */

import type { Payload } from "payload";
import { CSI_COLLECTION_SLUG } from "./constants";
import type {
  ClientSiteEventRecord,
  PersistClientSiteEventInput,
  PersistClientSiteEventResult,
} from "./types";

export interface ClientSiteEventStore {
  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ClientSiteEventRecord | null>;
  create(input: PersistClientSiteEventInput): Promise<ClientSiteEventRecord>;
  markActivityPublished(
    id: number,
    activityTimelineEventId: number,
  ): Promise<void>;
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error) return false;
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    parts.push(error.name);
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) parts.push(cause.message);
    if (cause && typeof cause === "object") {
      parts.push(JSON.stringify(cause));
    }
  } else {
    parts.push(String(error));
  }
  const text = parts.join(" ");
  return /unique|duplicate key|23505|idempotency/i.test(text);
}

function mapDoc(doc: Record<string, unknown>): ClientSiteEventRecord {
  const clientRel = doc.client;
  let clientId = 0;
  if (typeof clientRel === "number") clientId = clientRel;
  else if (clientRel && typeof clientRel === "object" && "id" in clientRel) {
    clientId = Number((clientRel as { id: unknown }).id);
  }

  return {
    id: Number(doc.id),
    clientId,
    clientKey: String(doc.clientKey ?? ""),
    eventClass: doc.eventClass as ClientSiteEventRecord["eventClass"],
    externalEventId: String(doc.externalEventId ?? ""),
    sourceSystem: String(doc.sourceSystem ?? ""),
    occurredAt: String(doc.occurredAt ?? ""),
    receivedAt: String(doc.receivedAt ?? ""),
    sensitivity: doc.sensitivity as ClientSiteEventRecord["sensitivity"],
    visibilityState: doc.visibilityState as ClientSiteEventRecord["visibilityState"],
    processingStatus:
      doc.processingStatus as ClientSiteEventRecord["processingStatus"],
    payload: (doc.payload as ClientSiteEventRecord["payload"]) ?? {},
    ingestMeta: (doc.ingestMeta as Record<string, unknown>) ?? {},
    activityTimelineEventId:
      doc.activityTimelineEventId != null
        ? Number(doc.activityTimelineEventId)
        : null,
    idempotencyKey: String(doc.idempotencyKey ?? ""),
  };
}

export function createPayloadClientSiteEventStore(
  payload: Payload,
): ClientSiteEventStore {
  return {
    async findByIdempotencyKey(idempotencyKey) {
      const found = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: CSI_COLLECTION_SLUG as any,
        where: { idempotencyKey: { equals: idempotencyKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const doc = found.docs[0] as Record<string, unknown> | undefined;
      return doc ? mapDoc(doc) : null;
    },

    async create(input) {
      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: CSI_COLLECTION_SLUG as any,
        data: {
          client: input.clientId,
          clientKey: input.clientKey,
          eventClass: input.eventClass,
          externalEventId: input.externalEventId,
          sourceSystem: input.sourceSystem,
          occurredAt: input.occurredAt,
          receivedAt: input.receivedAt,
          sensitivity: input.sensitivity,
          visibilityState: input.visibilityState,
          processingStatus: "persisted",
          payload: input.payload,
          ingestMeta: input.ingestMeta,
          idempotencyKey: input.idempotencyKey,
          activityTimelineEventId: null,
        },
        overrideAccess: true,
      });
      return mapDoc(created as Record<string, unknown>);
    },

    async markActivityPublished(id, activityTimelineEventId) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: CSI_COLLECTION_SLUG as any,
        id,
        data: {
          processingStatus: "activity_published",
          activityTimelineEventId,
        },
        overrideAccess: true,
      });
    },
  };
}

/**
 * In-memory store for verifiers — simulates unique constraint races.
 */
export function createMemoryClientSiteEventStore(): ClientSiteEventStore & {
  rows: ClientSiteEventRecord[];
} {
  const rows: ClientSiteEventRecord[] = [];
  let seq = 1;
  const locks = new Map<string, Promise<void>>();

  async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    locks.set(
      key,
      prev.then(() => gate),
    );
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  return {
    rows,
    async findByIdempotencyKey(idempotencyKey) {
      return rows.find((r) => r.idempotencyKey === idempotencyKey) ?? null;
    },
    async create(input) {
      return withKeyLock(input.idempotencyKey, async () => {
        const existing = rows.find((r) => r.idempotencyKey === input.idempotencyKey);
        if (existing) {
          const err = new Error(
            `duplicate key value violates unique constraint 23505 (${input.idempotencyKey})`,
          );
          throw err;
        }
        const record: ClientSiteEventRecord = {
          id: seq++,
          clientId: input.clientId,
          clientKey: input.clientKey,
          eventClass: input.eventClass,
          externalEventId: input.externalEventId,
          sourceSystem: input.sourceSystem,
          occurredAt: input.occurredAt,
          receivedAt: input.receivedAt,
          sensitivity: input.sensitivity,
          visibilityState: input.visibilityState,
          processingStatus: "persisted",
          payload: input.payload,
          ingestMeta: input.ingestMeta,
          activityTimelineEventId: null,
          idempotencyKey: input.idempotencyKey,
        };
        rows.push(record);
        return record;
      });
    },
    async markActivityPublished(id, activityTimelineEventId) {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      row.activityTimelineEventId = activityTimelineEventId;
      row.processingStatus = "activity_published";
    },
  };
}

/**
 * Persist-or-resolve idempotent existing event.
 * Relies on DB unique index for concurrent safety; catch + re-read on conflict.
 */
export async function persistClientSiteEventIdempotent(
  store: ClientSiteEventStore,
  input: PersistClientSiteEventInput,
): Promise<PersistClientSiteEventResult> {
  const existing = await store.findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return { kind: "duplicate", record: existing };
  }

  try {
    const created = await store.create(input);
    return { kind: "created", record: created };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await store.findByIdempotencyKey(input.idempotencyKey);
    if (!raced) throw error;
    return { kind: "duplicate", record: raced };
  }
}
