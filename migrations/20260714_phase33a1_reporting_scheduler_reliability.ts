/**
 * Phase 33A.1 — Additive reliability columns/indexes for environments that
 * already applied the thinner Phase 33A reporting_sync_states table.
 *
 * Idempotent with 20260714_phase33a_reporting_automation (IF NOT EXISTS).
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "reporting_sync_states"
      ADD COLUMN IF NOT EXISTS "integration_status" varchar DEFAULT 'idle',
      ADD COLUMN IF NOT EXISTS "last_completed_window_id" varchar,
      ADD COLUMN IF NOT EXISTS "execution_status" varchar DEFAULT 'idle',
      ADD COLUMN IF NOT EXISTS "execution_run_id" varchar,
      ADD COLUMN IF NOT EXISTS "execution_started_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "reporting_sync_states_client_provider_uidx"
      ON "reporting_sync_states" ("client_id", "provider");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_sync_states_window_idx"
      ON "reporting_sync_states" ("last_completed_window_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_sync_states_lease_idx"
      ON "reporting_sync_states" ("execution_status", "lease_expires_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "reporting_sync_states_client_provider_uidx";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "reporting_sync_states_window_idx";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "reporting_sync_states_lease_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "reporting_sync_states"
      DROP COLUMN IF EXISTS "integration_status",
      DROP COLUMN IF EXISTS "last_completed_window_id",
      DROP COLUMN IF EXISTS "execution_status",
      DROP COLUMN IF EXISTS "execution_run_id",
      DROP COLUMN IF EXISTS "execution_started_at",
      DROP COLUMN IF EXISTS "lease_expires_at";
  `);
}
