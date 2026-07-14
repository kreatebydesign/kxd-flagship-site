/**
 * Phase 33A + 33A.1 — Automated Reporting Engine schema (canonical).
 *
 * Fresh production migrate creates the complete reliability surface:
 * - Client Infrastructure automation schedule fields
 * - reporting_sync_states with schedule, lease, window, status, uniqueness
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      ADD COLUMN IF NOT EXISTS "reporting_automation_enabled" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "reporting_sync_hour_pacific" numeric DEFAULT 5;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "reporting_sync_states" (
      "id" serial PRIMARY KEY,
      "state_key" varchar NOT NULL,
      "client_id" integer,
      "provider" varchar,
      "automation_enabled" boolean DEFAULT true,
      "integration_status" varchar DEFAULT 'idle',
      "last_successful_sync_at" timestamp(3) with time zone,
      "last_failed_sync_at" timestamp(3) with time zone,
      "failure_reason" varchar,
      "consecutive_failures" numeric DEFAULT 0,
      "next_scheduled_sync_at" timestamp(3) with time zone,
      "last_completed_window_id" varchar,
      "last_outcome" varchar,
      "last_facts_written" numeric DEFAULT 0,
      "execution_status" varchar DEFAULT 'idle',
      "execution_run_id" varchar,
      "execution_started_at" timestamp(3) with time zone,
      "lease_expires_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  // Additive columns for environments that created the thinner 33A table first.
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
    CREATE UNIQUE INDEX IF NOT EXISTS "reporting_sync_states_state_key_idx"
      ON "reporting_sync_states" ("state_key");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "reporting_sync_states_client_provider_uidx"
      ON "reporting_sync_states" ("client_id", "provider");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_sync_states_client_idx"
      ON "reporting_sync_states" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_sync_states_provider_idx"
      ON "reporting_sync_states" ("provider");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_sync_states_window_idx"
      ON "reporting_sync_states" ("last_completed_window_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_sync_states_lease_idx"
      ON "reporting_sync_states" ("execution_status", "lease_expires_at");
  `);

  // Best-effort FK — skipped quietly when clients table naming differs in a fork.
  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'reporting_sync_states_client_id_fk'
        ) THEN
          ALTER TABLE "reporting_sync_states"
            ADD CONSTRAINT "reporting_sync_states_client_id_fk"
            FOREIGN KEY ("client_id") REFERENCES "clients"("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal on exotic local schemas */
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "reporting_sync_states";
  `);
  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      DROP COLUMN IF EXISTS "reporting_automation_enabled",
      DROP COLUMN IF EXISTS "reporting_sync_hour_pacific";
  `);
}
