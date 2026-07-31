/**
 * Additive approval-first branded monthly report fields.
 * Extends monthly_reports + client_infrastructure.
 * Do not run against production from this task — local disposable DB only.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_monthly_reports_approval_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_monthly_reports_approval_status"
          AS ENUM(
            'draft',
            'in-review',
            'approved',
            'ready-for-manual-delivery',
            'archived'
          );
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_monthly_reports_delivery_mode'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_monthly_reports_delivery_mode"
          AS ENUM('manual', 'future-automatic');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    ALTER TABLE "monthly_reports"
      ADD COLUMN IF NOT EXISTS "approval_status" "public"."enum_monthly_reports_approval_status" DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS "delivery_mode" "public"."enum_monthly_reports_delivery_mode" DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS "reporting_timezone" varchar DEFAULT 'America/Los_Angeles',
      ADD COLUMN IF NOT EXISTS "included_capabilities" jsonb,
      ADD COLUMN IF NOT EXISTS "scope_confirmed_by" varchar,
      ADD COLUMN IF NOT EXISTS "scope_confirmed_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "scope_notes" varchar,
      ADD COLUMN IF NOT EXISTS "approved_snapshot" jsonb,
      ADD COLUMN IF NOT EXISTS "approved_fingerprint" varchar,
      ADD COLUMN IF NOT EXISTS "report_approved_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "report_approved_by" varchar,
      ADD COLUMN IF NOT EXISTS "pdf_generated_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "pdf_downloaded_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "pdf_downloaded_by" varchar,
      ADD COLUMN IF NOT EXISTS "pdf_storage_key" varchar,
      ADD COLUMN IF NOT EXISTS "website_performance_narrative" varchar,
      ADD COLUMN IF NOT EXISTS "organic_search_narrative" varchar,
      ADD COLUMN IF NOT EXISTS "google_ads_narrative" varchar,
      ADD COLUMN IF NOT EXISTS "improvements_made" varchar,
      ADD COLUMN IF NOT EXISTS "issues_or_risks" varchar,
      ADD COLUMN IF NOT EXISTS "august_priorities" varchar,
      ADD COLUMN IF NOT EXISTS "closing_note" varchar,
      ADD COLUMN IF NOT EXISTS "selected_work_items" jsonb,
      ADD COLUMN IF NOT EXISTS "data_provenance" jsonb;
  `);

  await db.execute(sql`
    UPDATE "monthly_reports"
    SET "approval_status" = 'draft'
    WHERE "approval_status" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "monthly_reports"
      ALTER COLUMN "approval_status" SET DEFAULT 'draft',
      ALTER COLUMN "approval_status" SET NOT NULL,
      ALTER COLUMN "delivery_mode" SET DEFAULT 'manual';
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "monthly_reports_approval_status_idx"
      ON "monthly_reports" USING btree ("approval_status");
    CREATE INDEX IF NOT EXISTS "monthly_reports_approved_fingerprint_idx"
      ON "monthly_reports" USING btree ("approved_fingerprint");
  `);

  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      ADD COLUMN IF NOT EXISTS "reporting_enabled" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "reporting_timezone" varchar DEFAULT 'America/Los_Angeles',
      ADD COLUMN IF NOT EXISTS "reporting_capabilities_override" jsonb,
      ADD COLUMN IF NOT EXISTS "reporting_recipients" jsonb,
      ADD COLUMN IF NOT EXISTS "reporting_day_preference" numeric,
      ADD COLUMN IF NOT EXISTS "reporting_operator_notes" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "monthly_reports_approval_status_idx";
    DROP INDEX IF EXISTS "monthly_reports_approved_fingerprint_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "monthly_reports"
      DROP COLUMN IF EXISTS "approval_status",
      DROP COLUMN IF EXISTS "delivery_mode",
      DROP COLUMN IF EXISTS "reporting_timezone",
      DROP COLUMN IF EXISTS "included_capabilities",
      DROP COLUMN IF EXISTS "scope_confirmed_by",
      DROP COLUMN IF EXISTS "scope_confirmed_at",
      DROP COLUMN IF EXISTS "scope_notes",
      DROP COLUMN IF EXISTS "approved_snapshot",
      DROP COLUMN IF EXISTS "approved_fingerprint",
      DROP COLUMN IF EXISTS "report_approved_at",
      DROP COLUMN IF EXISTS "report_approved_by",
      DROP COLUMN IF EXISTS "pdf_generated_at",
      DROP COLUMN IF EXISTS "pdf_downloaded_at",
      DROP COLUMN IF EXISTS "pdf_downloaded_by",
      DROP COLUMN IF EXISTS "pdf_storage_key",
      DROP COLUMN IF EXISTS "website_performance_narrative",
      DROP COLUMN IF EXISTS "organic_search_narrative",
      DROP COLUMN IF EXISTS "google_ads_narrative",
      DROP COLUMN IF EXISTS "improvements_made",
      DROP COLUMN IF EXISTS "issues_or_risks",
      DROP COLUMN IF EXISTS "august_priorities",
      DROP COLUMN IF EXISTS "closing_note",
      DROP COLUMN IF EXISTS "selected_work_items",
      DROP COLUMN IF EXISTS "data_provenance";
  `);

  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      DROP COLUMN IF EXISTS "reporting_enabled",
      DROP COLUMN IF EXISTS "reporting_timezone",
      DROP COLUMN IF EXISTS "reporting_capabilities_override",
      DROP COLUMN IF EXISTS "reporting_recipients",
      DROP COLUMN IF EXISTS "reporting_day_preference",
      DROP COLUMN IF EXISTS "reporting_operator_notes";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_monthly_reports_approval_status";
    DROP TYPE IF EXISTS "public"."enum_monthly_reports_delivery_mode";
  `);
}
