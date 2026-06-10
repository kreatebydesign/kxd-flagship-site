/**
 * KXD OS Phase 2D — Retainer Intelligence Layer.
 * Adds new columns to the retainers table and new enum values to billing_status.
 * All operations are idempotent (IF NOT EXISTS / DO $$ guards).
 * Safe to run against production — no destructive changes.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. Add new billingStatus enum values ─────────────────────────────────────
  // PostgreSQL does not allow removing enum values — only adding.
  // We add 'current' and 'upcoming' alongside the existing: active, paused, overdue, ended.
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_retainers_billing_status'
          AND t.typnamespace = 'public'::regnamespace
          AND e.enumlabel = 'current'
      ) THEN
        ALTER TYPE "public"."enum_retainers_billing_status" ADD VALUE 'current';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_retainers_billing_status'
          AND t.typnamespace = 'public'::regnamespace
          AND e.enumlabel = 'upcoming'
      ) THEN
        ALTER TYPE "public"."enum_retainers_billing_status" ADD VALUE 'upcoming';
      END IF;
    END$$;
  `);

  // ── 2. Add new columns to retainers ──────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "retainers"
      ADD COLUMN IF NOT EXISTS "billing_day"         integer,
      ADD COLUMN IF NOT EXISTS "auto_renew"          boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "contract_start_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "contract_end_date"   timestamp(3) with time zone;
  `);

  // ── 3. Indexes on new columns ─────────────────────────────────────────────────
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "retainers_billing_day_idx"
      ON "retainers" USING btree ("billing_day");
    CREATE INDEX IF NOT EXISTS "retainers_contract_end_date_idx"
      ON "retainers" USING btree ("contract_end_date");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop the added columns (enum values cannot be removed from PostgreSQL enums).
  await db.execute(sql`
    ALTER TABLE "retainers"
      DROP COLUMN IF EXISTS "billing_day",
      DROP COLUMN IF EXISTS "auto_renew",
      DROP COLUMN IF EXISTS "contract_start_date",
      DROP COLUMN IF EXISTS "contract_end_date";
  `);
}
