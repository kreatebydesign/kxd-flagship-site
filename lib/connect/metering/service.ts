/**
 * Phase 6 Batch C0 — trusted server-side meter increment/read services.
 *
 * Meter writes require trusted callers (overrideAccess LocalAPI / admin routes).
 * Reads are organization-scoped — never return other organizations' meters.
 * Records never store message bodies, filenames, or personal content.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@/payload.config";
import { isConnectMeterKey } from "./definitions";
import { connectDailyPeriodKey } from "./period";
import type {
  ConnectMeterAggregate,
  ConnectMeterIncrementInput,
  ConnectMeterIncrementResult,
  ConnectMeterStore,
} from "./store";
import type { ConnectMeterKey, ConnectMeterPeriodKind } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type TrustedConnectMeterCaller = {
  /** Must be true — client request bodies cannot authorize meter writes. */
  trustedServerCaller: true;
  actorOperatorUserId?: number | null;
};

function assertTrusted(caller: TrustedConnectMeterCaller): void {
  if (caller.trustedServerCaller !== true) {
    throw new Error("Connect meter writes require a trusted server-side caller.");
  }
}

export async function incrementConnectMeter(input: {
  organizationId: number;
  meterKey: ConnectMeterKey;
  delta: number;
  idempotencyKey?: string | null;
  periodKind?: ConnectMeterPeriodKind;
  periodKey?: string;
  at?: Date;
  caller: TrustedConnectMeterCaller;
  store?: ConnectMeterStore;
}): Promise<ConnectMeterIncrementResult> {
  assertTrusted(input.caller);

  if (!isConnectMeterKey(input.meterKey)) {
    return { ok: false, reason: "invalid_delta" };
  }

  const periodKind = input.periodKind ?? "daily";
  const periodKey = input.periodKey ?? connectDailyPeriodKey(input.at);
  const payloadInput: ConnectMeterIncrementInput = {
    organizationId: input.organizationId,
    meterKey: input.meterKey,
    periodKind,
    periodKey,
    delta: input.delta,
    idempotencyKey: input.idempotencyKey,
  };

  if (input.store) {
    return input.store.increment(payloadInput);
  }

  return incrementViaPayload(payloadInput);
}

async function incrementViaPayload(
  input: ConnectMeterIncrementInput,
): Promise<ConnectMeterIncrementResult> {
  if (
    !Number.isFinite(input.organizationId) ||
    input.organizationId <= 0
  ) {
    return { ok: false, reason: "invalid_organization" };
  }
  if (!Number.isFinite(input.delta) || !Number.isInteger(input.delta)) {
    return { ok: false, reason: "invalid_delta" };
  }

  const payload = await getPayload({ config });

  if (input.idempotencyKey) {
    const existingIdem = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-usage-idempotency" as any,
      where: {
        and: [
          { organization: { equals: input.organizationId } },
          { idempotencyKey: { equals: input.idempotencyKey } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existingIdem.docs.length > 0) {
      const current = await readConnectMeterQuantity({
        organizationId: input.organizationId,
        meterKey: input.meterKey,
        periodKind: input.periodKind,
        periodKey: input.periodKey,
      });
      return {
        ok: true,
        quantity: current,
        applied: false,
        duplicate: true,
      };
    }
  }

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-usage-meters" as any,
    where: {
      and: [
        { organization: { equals: input.organizationId } },
        { meterKey: { equals: input.meterKey } },
        { periodKind: { equals: input.periodKind } },
        { periodKey: { equals: input.periodKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  let quantity = 0;
  if (existing.docs.length > 0) {
    const doc = existing.docs[0] as AnyDoc;
    const prev = Number(doc.quantity ?? 0);
    quantity = prev + input.delta;
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-usage-meters" as any,
      id: doc.id,
      data: { quantity },
      overrideAccess: true,
    });
  } else {
    quantity = input.delta;
    try {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-usage-meters" as any,
        data: {
          organization: input.organizationId,
          meterKey: input.meterKey,
          periodKind: input.periodKind,
          periodKey: input.periodKey,
          quantity,
        },
        overrideAccess: true,
      });
    } catch {
      // Concurrent create race — retry as update.
      const raced = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-usage-meters" as any,
        where: {
          and: [
            { organization: { equals: input.organizationId } },
            { meterKey: { equals: input.meterKey } },
            { periodKind: { equals: input.periodKind } },
            { periodKey: { equals: input.periodKey } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (raced.docs.length === 0) throw new Error("Connect meter upsert failed.");
      const doc = raced.docs[0] as AnyDoc;
      quantity = Number(doc.quantity ?? 0) + input.delta;
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-usage-meters" as any,
        id: doc.id,
        data: { quantity },
        overrideAccess: true,
      });
    }
  }

  if (input.idempotencyKey) {
    try {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-usage-idempotency" as any,
        data: {
          organization: input.organizationId,
          idempotencyKey: input.idempotencyKey,
          meterKey: input.meterKey,
          periodKind: input.periodKind,
          periodKey: input.periodKey,
          delta: input.delta,
        },
        overrideAccess: true,
      });
    } catch {
      // Unique conflict means another caller won the idempotency race — treat as duplicate.
      const current = await readConnectMeterQuantity({
        organizationId: input.organizationId,
        meterKey: input.meterKey,
        periodKind: input.periodKind,
        periodKey: input.periodKey,
      });
      return {
        ok: true,
        quantity: current,
        applied: false,
        duplicate: true,
      };
    }
  }

  return { ok: true, quantity, applied: true, duplicate: false };
}

export async function readConnectMeterQuantity(input: {
  organizationId: number;
  meterKey: ConnectMeterKey;
  periodKind: ConnectMeterPeriodKind;
  periodKey: string;
  store?: ConnectMeterStore;
}): Promise<number> {
  if (input.store) {
    return input.store.read(input);
  }

  const payload = await getPayload({ config });
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-usage-meters" as any,
    where: {
      and: [
        { organization: { equals: input.organizationId } },
        { meterKey: { equals: input.meterKey } },
        { periodKind: { equals: input.periodKind } },
        { periodKey: { equals: input.periodKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs.length === 0) return 0;
  return Number((existing.docs[0] as AnyDoc).quantity ?? 0);
}

/**
 * Organization-scoped meter read. Always filters by organizationId —
 * never returns other organizations even if called with a broad query.
 */
export async function listConnectMetersForOrganization(input: {
  organizationId: number;
  caller: TrustedConnectMeterCaller;
  store?: ConnectMeterStore;
}): Promise<ConnectMeterAggregate[]> {
  assertTrusted(input.caller);
  if (!Number.isFinite(input.organizationId) || input.organizationId <= 0) {
    return [];
  }

  if (input.store) {
    return input.store.listForOrganization(input.organizationId);
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-usage-meters" as any,
    where: { organization: { equals: input.organizationId } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  return result.docs
    .map((doc) => {
      const row = doc as AnyDoc;
      const orgId =
        typeof row.organization === "number"
          ? row.organization
          : Number(row.organization?.id);
      // Defense in depth — drop any row that somehow escapes the where filter.
      if (orgId !== input.organizationId) return null;
      return {
        organizationId: orgId,
        meterKey: row.meterKey as ConnectMeterKey,
        periodKind: row.periodKind as ConnectMeterPeriodKind,
        periodKey: String(row.periodKey),
        quantity: Number(row.quantity ?? 0),
      };
    })
    .filter((row): row is ConnectMeterAggregate => row != null);
}
