/**
 * Additive Website Audit Report Generator fields on website_audits.
 * Does not alter existing lead/score/recommendation columns.
 * Do not run against production from this task.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_website_audits_report_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_website_audits_report_status"
          AS ENUM('none', 'draft', 'ready-for-review', 'approved', 'archived');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    ALTER TABLE "website_audits"
      ADD COLUMN IF NOT EXISTS "client_id" integer,
      ADD COLUMN IF NOT EXISTS "canonical_website_url" varchar,
      ADD COLUMN IF NOT EXISTS "internal_notes" varchar,
      ADD COLUMN IF NOT EXISTS "report_status" "public"."enum_website_audits_report_status" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "report_title" varchar,
      ADD COLUMN IF NOT EXISTS "executive_summary" varchar,
      ADD COLUMN IF NOT EXISTS "working_well" varchar,
      ADD COLUMN IF NOT EXISTS "losing_opportunity" varchar,
      ADD COLUMN IF NOT EXISTS "recommended_next_steps" varchar,
      ADD COLUMN IF NOT EXISTS "closing_note" varchar,
      ADD COLUMN IF NOT EXISTS "section_visibility" jsonb,
      ADD COLUMN IF NOT EXISTS "finding_overrides" jsonb,
      ADD COLUMN IF NOT EXISTS "manual_findings" jsonb,
      ADD COLUMN IF NOT EXISTS "recommendation_plan" jsonb,
      ADD COLUMN IF NOT EXISTS "approved_snapshot" jsonb,
      ADD COLUMN IF NOT EXISTS "report_generated_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "report_updated_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "report_approved_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "report_approved_by" varchar,
      ADD COLUMN IF NOT EXISTS "report_downloaded_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "report_downloaded_by" varchar;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'website_audits_client_id_clients_id_fk'
      ) THEN
        ALTER TABLE "website_audits"
          ADD CONSTRAINT "website_audits_client_id_clients_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "clients"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "website_audits_client_idx"
      ON "website_audits" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "website_audits_report_status_idx"
      ON "website_audits" USING btree ("report_status");
  `);

  await db.execute(sql`
    UPDATE "website_audits"
    SET "report_status" = 'none'
    WHERE "report_status" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "website_audits"
      ALTER COLUMN "report_status" SET DEFAULT 'none',
      ALTER COLUMN "report_status" SET NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "website_audits_client_idx";
    DROP INDEX IF EXISTS "website_audits_report_status_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "website_audits"
      DROP CONSTRAINT IF EXISTS "website_audits_client_id_clients_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "website_audits"
      DROP COLUMN IF EXISTS "client_id",
      DROP COLUMN IF EXISTS "canonical_website_url",
      DROP COLUMN IF EXISTS "internal_notes",
      DROP COLUMN IF EXISTS "report_status",
      DROP COLUMN IF EXISTS "report_title",
      DROP COLUMN IF EXISTS "executive_summary",
      DROP COLUMN IF EXISTS "working_well",
      DROP COLUMN IF EXISTS "losing_opportunity",
      DROP COLUMN IF EXISTS "recommended_next_steps",
      DROP COLUMN IF EXISTS "closing_note",
      DROP COLUMN IF EXISTS "section_visibility",
      DROP COLUMN IF EXISTS "finding_overrides",
      DROP COLUMN IF EXISTS "manual_findings",
      DROP COLUMN IF EXISTS "recommendation_plan",
      DROP COLUMN IF EXISTS "approved_snapshot",
      DROP COLUMN IF EXISTS "report_generated_at",
      DROP COLUMN IF EXISTS "report_updated_at",
      DROP COLUMN IF EXISTS "report_approved_at",
      DROP COLUMN IF EXISTS "report_approved_by",
      DROP COLUMN IF EXISTS "report_downloaded_at",
      DROP COLUMN IF EXISTS "report_downloaded_by";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_website_audits_report_status";
  `);
}
