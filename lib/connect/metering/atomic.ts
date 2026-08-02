/**
 * Phase 6 Batch C1 — database-level atomic meter increment when Postgres is available.
 *
 * Uses INSERT … ON CONFLICT for both idempotency reservation and quantity upsert.
 * Avoids lost-update races from read-modify-write under concurrent message metering.
 *
 * Remaining failure mode (documented): when Payload is running on the sqlite
 * adapter (local fallback without DATABASE_URL), atomic SQL is unavailable and
 * the service falls back to the contained Payload LocalAPI path. Dogfood
 * activation requires Postgres (Neon) so the atomic path is used.
 */

import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { ConnectMeterKey, ConnectMeterPeriodKind } from "../types";
import type { ConnectMeterIncrementResult } from "./store";

type PgExecutable = {
  execute: (query: unknown) => Promise<unknown>;
};

function getPostgresExecutor(payload: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
}): PgExecutable | null {
  const db = payload.db;
  if (!db) return null;
  // Postgres adapter exposes drizzle with execute; sqlite does not use this path.
  if (db.drizzle && typeof db.drizzle.execute === "function") {
    return db.drizzle as PgExecutable;
  }
  if (typeof db.execute === "function") {
    return db as PgExecutable;
  }
  return null;
}

export function canUseAtomicConnectMeterIncrement(payload: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
}): boolean {
  return getPostgresExecutor(payload) != null;
}

export async function incrementConnectMeterAtomic(input: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: { db?: any };
  organizationId: number;
  meterKey: ConnectMeterKey;
  periodKind: ConnectMeterPeriodKind;
  periodKey: string;
  delta: number;
  idempotencyKey?: string | null;
}): Promise<ConnectMeterIncrementResult | { ok: false; reason: "atomic_unavailable" }> {
  const executor = getPostgresExecutor(input.payload);
  if (!executor) {
    return { ok: false, reason: "atomic_unavailable" };
  }

  if (
    !Number.isFinite(input.organizationId) ||
    input.organizationId <= 0 ||
    !Number.isFinite(input.delta) ||
    !Number.isInteger(input.delta)
  ) {
    return { ok: false, reason: "invalid_delta" };
  }

  // Reserve idempotency first — unique conflict means prior successful apply.
  if (input.idempotencyKey) {
    try {
      await executor.execute(sql`
        INSERT INTO "connect_usage_idempotency" (
          "organization_id",
          "idempotency_key",
          "meter_key",
          "period_kind",
          "period_key",
          "delta",
          "created_at",
          "updated_at"
        ) VALUES (
          ${input.organizationId},
          ${input.idempotencyKey},
          ${input.meterKey},
          ${input.periodKind},
          ${input.periodKey},
          ${input.delta},
          now(),
          now()
        )
      `);
    } catch {
      const current = await readQuantity(executor, input);
      return {
        ok: true,
        quantity: current,
        applied: false,
        duplicate: true,
      };
    }
  }

  const rows = (await executor.execute(sql`
    INSERT INTO "connect_usage_meters" (
      "organization_id",
      "meter_key",
      "period_kind",
      "period_key",
      "quantity",
      "created_at",
      "updated_at"
    ) VALUES (
      ${input.organizationId},
      ${input.meterKey}::"public"."enum_connect_usage_meters_meter_key",
      ${input.periodKind}::"public"."enum_connect_usage_meters_period_kind",
      ${input.periodKey},
      ${input.delta},
      now(),
      now()
    )
    ON CONFLICT ("organization_id", "meter_key", "period_kind", "period_key")
    DO UPDATE SET
      "quantity" = "connect_usage_meters"."quantity" + ${input.delta},
      "updated_at" = now()
    RETURNING "quantity"
  `)) as { rows?: Array<{ quantity: string | number }> } | Array<{ quantity: string | number }>;

  const list = Array.isArray(rows) ? rows : (rows.rows ?? []);
  const quantity = Number(list[0]?.quantity ?? input.delta);
  return {
    ok: true,
    quantity: Number.isFinite(quantity) ? quantity : input.delta,
    applied: true,
    duplicate: false,
  };
}

async function readQuantity(
  executor: PgExecutable,
  input: {
    organizationId: number;
    meterKey: ConnectMeterKey;
    periodKind: ConnectMeterPeriodKind;
    periodKey: string;
  },
): Promise<number> {
  const rows = (await executor.execute(sql`
    SELECT "quantity"
    FROM "connect_usage_meters"
    WHERE "organization_id" = ${input.organizationId}
      AND "meter_key" = ${input.meterKey}::"public"."enum_connect_usage_meters_meter_key"
      AND "period_kind" = ${input.periodKind}::"public"."enum_connect_usage_meters_period_kind"
      AND "period_key" = ${input.periodKey}
    LIMIT 1
  `)) as { rows?: Array<{ quantity: string | number }> } | Array<{ quantity: string | number }>;
  const list = Array.isArray(rows) ? rows : (rows.rows ?? []);
  return Number(list[0]?.quantity ?? 0);
}
