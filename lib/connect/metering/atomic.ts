/**
 * Phase 6 Batch C1/C3 — database-level atomic meter increment (Postgres).
 *
 * C3: Idempotency reservation and quantity upsert run in one atomic SQL
 * statement (CTE). Concurrent unique sends each count once; retries with the
 * same idempotency key never double-count. A failed mid-statement cannot leave
 * an idempotency row without a matching increment.
 *
 * SQLite local fallback remains in metering/service.ts and must not define
 * production Postgres behavior. Dogfood requires this Postgres path.
 */

import "server-only";

import { sql } from "@payloadcms/db-postgres";
import {
  asRowList,
  canUseConnectPostgres,
  getConnectPostgresExecutor,
} from "../db";
import type { ConnectMeterKey, ConnectMeterPeriodKind } from "../types";
import type { ConnectMeterIncrementResult } from "./store";

export function canUseAtomicConnectMeterIncrement(payload: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
}): boolean {
  return canUseConnectPostgres(payload);
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
}): Promise<
  ConnectMeterIncrementResult | { ok: false; reason: "atomic_unavailable" }
> {
  const executor = getConnectPostgresExecutor(input.payload);
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

  if (input.idempotencyKey) {
    // Single atomic statement: reserve idempotency OR do nothing; increment
    // only when the reservation inserted a new row.
    const rows = asRowList<{
      quantity: string | number | null;
      applied: boolean | null;
    }>(
      (await executor.execute(sql`
        WITH reserved AS (
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
          ON CONFLICT ("organization_id", "idempotency_key") DO NOTHING
          RETURNING "id"
        ),
        applied AS (
          INSERT INTO "connect_usage_meters" (
            "organization_id",
            "meter_key",
            "period_kind",
            "period_key",
            "quantity",
            "created_at",
            "updated_at"
          )
          SELECT
            ${input.organizationId},
            ${input.meterKey}::"public"."enum_connect_usage_meters_meter_key",
            ${input.periodKind}::"public"."enum_connect_usage_meters_period_kind",
            ${input.periodKey},
            ${input.delta},
            now(),
            now()
          WHERE EXISTS (SELECT 1 FROM reserved)
          ON CONFLICT ("organization_id", "meter_key", "period_kind", "period_key")
          DO UPDATE SET
            "quantity" = "connect_usage_meters"."quantity" + EXCLUDED."quantity",
            "updated_at" = now()
          RETURNING "quantity"
        )
        SELECT
          COALESCE(
            (SELECT "quantity" FROM applied),
            (
              SELECT "quantity"
              FROM "connect_usage_meters"
              WHERE "organization_id" = ${input.organizationId}
                AND "meter_key" = ${input.meterKey}::"public"."enum_connect_usage_meters_meter_key"
                AND "period_kind" = ${input.periodKind}::"public"."enum_connect_usage_meters_period_kind"
                AND "period_key" = ${input.periodKey}
              LIMIT 1
            ),
            0
          ) AS "quantity",
          EXISTS (SELECT 1 FROM reserved) AS "applied"
      `)) as never,
    );

    const row = rows[0];
    const applied = Boolean(row?.applied);
    const quantity = Number(row?.quantity ?? 0);
    return {
      ok: true,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      applied,
      duplicate: !applied,
    };
  }

  const rows = asRowList<{ quantity: string | number }>(
    (await executor.execute(sql`
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
    `)) as never,
  );

  const quantity = Number(rows[0]?.quantity ?? input.delta);
  return {
    ok: true,
    quantity: Number.isFinite(quantity) ? quantity : input.delta,
    applied: true,
    duplicate: false,
  };
}
