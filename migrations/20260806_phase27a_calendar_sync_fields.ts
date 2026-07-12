/**
 * Phase 27A — Calendar synchronization & recovery fields on work_schedule_links.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_work_schedule_links_external_change_class" AS ENUM (
        'none',
        'metadata_only',
        'schedule_impacting',
        'descriptive',
        'cancelled',
        'missing',
        'authorization_failure',
        'provider_unavailable',
        'transient_error',
        'manual_review'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_work_schedule_links_recovery_state" AS ENUM (
        'none',
        'review_required',
        'cancelled_remote',
        'missing_remote',
        'restored'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "work_schedule_links"
      ADD COLUMN IF NOT EXISTS "last_sync_attempt_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "sync_failure_code" varchar,
      ADD COLUMN IF NOT EXISTS "sync_failure_message" varchar,
      ADD COLUMN IF NOT EXISTS "external_change_class" "public"."enum_work_schedule_links_external_change_class" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "external_change_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "recovery_state" "public"."enum_work_schedule_links_recovery_state" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "provider_event_status" varchar,
      ADD COLUMN IF NOT EXISTS "observed_title" varchar,
      ADD COLUMN IF NOT EXISTS "observed_location" varchar,
      ADD COLUMN IF NOT EXISTS "cancelled_remote_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "missing_remote_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "work_schedule_links"
      DROP COLUMN IF EXISTS "missing_remote_at",
      DROP COLUMN IF EXISTS "cancelled_remote_at",
      DROP COLUMN IF EXISTS "observed_location",
      DROP COLUMN IF EXISTS "observed_title",
      DROP COLUMN IF EXISTS "provider_event_status",
      DROP COLUMN IF EXISTS "recovery_state",
      DROP COLUMN IF EXISTS "external_change_at",
      DROP COLUMN IF EXISTS "external_change_class",
      DROP COLUMN IF EXISTS "sync_failure_message",
      DROP COLUMN IF EXISTS "sync_failure_code",
      DROP COLUMN IF EXISTS "last_sync_attempt_at";

    DROP TYPE IF EXISTS "public"."enum_work_schedule_links_recovery_state";
    DROP TYPE IF EXISTS "public"."enum_work_schedule_links_external_change_class";
  `);
}
