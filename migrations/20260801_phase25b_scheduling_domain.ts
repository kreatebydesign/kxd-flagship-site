/**
 * Phase 25B — Scheduling Domain Foundation
 * work_schedule_links table + Work projection columns.
 * No Google Calendar fields are live — linkage columns are stubs only.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_schedule_links_status') THEN
        CREATE TYPE "public"."enum_work_schedule_links_status" AS ENUM(
          'draft', 'proposed', 'approval_required', 'approved', 'rejected',
          'scheduled', 'reschedule_required', 'canceled', 'completed', 'sync_error'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_schedule_links_approval_status') THEN
        CREATE TYPE "public"."enum_work_schedule_links_approval_status" AS ENUM(
          'none', 'pending', 'approved', 'rejected', 'auto_approved'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_schedule_links_sync_status') THEN
        CREATE TYPE "public"."enum_work_schedule_links_sync_status" AS ENUM(
          'none', 'pending_write', 'synced', 'stale', 'deleted_remotely', 'error'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_schedule_links_scheduling_mode') THEN
        CREATE TYPE "public"."enum_work_schedule_links_scheduling_mode" AS ENUM(
          'suggest', 'direct', 'restricted'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_schedule_links_permission_level') THEN
        CREATE TYPE "public"."enum_work_schedule_links_permission_level" AS ENUM(
          '1', '2', '3'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_schedule_links_confidence') THEN
        CREATE TYPE "public"."enum_work_schedule_links_confidence" AS ENUM(
          'low', 'medium', 'high'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_schedule_links_source') THEN
        CREATE TYPE "public"."enum_work_schedule_links_source" AS ENUM(
          'operator', 'policy', 'system'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_scheduling_status') THEN
        CREATE TYPE "public"."enum_work_scheduling_status" AS ENUM(
          'none', 'proposed', 'scheduled', 'conflict', 'sync_error'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "work_schedule_links" (
      "id" serial PRIMARY KEY NOT NULL,
      "work_id" integer NOT NULL,
      "calendar_owner_id" integer,
      "requested_by_id" integer,
      "approved_by_id" integer,
      "status" "public"."enum_work_schedule_links_status" DEFAULT 'draft' NOT NULL,
      "approval_status" "public"."enum_work_schedule_links_approval_status" DEFAULT 'none' NOT NULL,
      "sync_status" "public"."enum_work_schedule_links_sync_status" DEFAULT 'none' NOT NULL,
      "scheduling_mode" "public"."enum_work_schedule_links_scheduling_mode" DEFAULT 'suggest' NOT NULL,
      "permission_level" "public"."enum_work_schedule_links_permission_level" DEFAULT '1' NOT NULL,
      "proposed_start" timestamp(3) with time zone NOT NULL,
      "proposed_end" timestamp(3) with time zone NOT NULL,
      "timezone" varchar DEFAULT 'America/Los_Angeles' NOT NULL,
      "duration_minutes" numeric NOT NULL,
      "scheduling_reason" varchar,
      "evidence_summary" varchar,
      "confidence" "public"."enum_work_schedule_links_confidence" DEFAULT 'medium',
      "source" "public"."enum_work_schedule_links_source" DEFAULT 'operator' NOT NULL,
      "restriction_reason" varchar,
      "rejection_reason" varchar,
      "canceled_reason" varchar,
      "google_calendar_id" varchar,
      "google_event_id" varchar,
      "google_event_etag" varchar,
      "google_event_updated_at" timestamp(3) with time zone,
      "google_event_html_link" varchar,
      "policy_snapshot" jsonb,
      "conflict_snapshot" jsonb,
      "displaced_item_snapshot" jsonb,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_schedule_links_work_id_fk'
      ) THEN
        ALTER TABLE "work_schedule_links"
          ADD CONSTRAINT "work_schedule_links_work_id_fk"
          FOREIGN KEY ("work_id") REFERENCES "public"."work"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_schedule_links_calendar_owner_id_fk'
      ) THEN
        ALTER TABLE "work_schedule_links"
          ADD CONSTRAINT "work_schedule_links_calendar_owner_id_fk"
          FOREIGN KEY ("calendar_owner_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_schedule_links_requested_by_id_fk'
      ) THEN
        ALTER TABLE "work_schedule_links"
          ADD CONSTRAINT "work_schedule_links_requested_by_id_fk"
          FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_schedule_links_approved_by_id_fk'
      ) THEN
        ALTER TABLE "work_schedule_links"
          ADD CONSTRAINT "work_schedule_links_approved_by_id_fk"
          FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "work_schedule_links_work_idx"
      ON "work_schedule_links" USING btree ("work_id");
    CREATE INDEX IF NOT EXISTS "work_schedule_links_status_idx"
      ON "work_schedule_links" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "work_schedule_links_approval_status_idx"
      ON "work_schedule_links" USING btree ("approval_status");
    CREATE INDEX IF NOT EXISTS "work_schedule_links_proposed_start_idx"
      ON "work_schedule_links" USING btree ("proposed_start");
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      ADD COLUMN IF NOT EXISTS "scheduling_status" "public"."enum_work_scheduling_status" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "scheduled_start" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "scheduled_end" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "active_schedule_link_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_active_schedule_link_id_fk'
      ) THEN
        ALTER TABLE "work"
          ADD CONSTRAINT "work_active_schedule_link_id_fk"
          FOREIGN KEY ("active_schedule_link_id")
          REFERENCES "public"."work_schedule_links"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "work_scheduling_status_idx"
      ON "work" USING btree ("scheduling_status");
    CREATE INDEX IF NOT EXISTS "work_scheduled_start_idx"
      ON "work" USING btree ("scheduled_start");
    CREATE INDEX IF NOT EXISTS "work_active_schedule_link_idx"
      ON "work" USING btree ("active_schedule_link_id");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "work_schedule_links_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "work_schedule_links_id";
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "work_active_schedule_link_idx";
    DROP INDEX IF EXISTS "work_scheduled_start_idx";
    DROP INDEX IF EXISTS "work_scheduling_status_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      DROP CONSTRAINT IF EXISTS "work_active_schedule_link_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      DROP COLUMN IF EXISTS "active_schedule_link_id",
      DROP COLUMN IF EXISTS "scheduled_end",
      DROP COLUMN IF EXISTS "scheduled_start",
      DROP COLUMN IF EXISTS "scheduling_status";
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "work_schedule_links_proposed_start_idx";
    DROP INDEX IF EXISTS "work_schedule_links_approval_status_idx";
    DROP INDEX IF EXISTS "work_schedule_links_status_idx";
    DROP INDEX IF EXISTS "work_schedule_links_work_idx";
  `);

  await db.execute(sql`DROP TABLE IF EXISTS "work_schedule_links" CASCADE;`);
}
