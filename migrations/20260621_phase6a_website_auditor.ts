/**
 * KXD OS Phase 6A — website_audits table
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_website_audits_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_website_audits_status"
          AS ENUM('new-lead', 'contacted', 'qualified', 'proposal-sent', 'closed-won', 'closed-lost');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "website_audits" (
      "id"                 serial PRIMARY KEY NOT NULL,
      "name"               varchar NOT NULL,
      "email"              varchar NOT NULL,
      "company"            varchar,
      "website"            varchar NOT NULL,
      "overall_score"      numeric,
      "grade"              varchar,
      "performance_score"  numeric,
      "seo_score"          numeric,
      "mobile_score"       numeric,
      "conversion_score"   numeric,
      "brand_score"        numeric,
      "strengths"          varchar,
      "opportunities"      varchar,
      "recommendations"    varchar,
      "status"             "public"."enum_website_audits_status" DEFAULT 'new-lead' NOT NULL,
      "completed_at"       timestamp(3) with time zone,
      "updated_at"         timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"         timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "website_audits_status_idx"
      ON "website_audits" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "website_audits_created_at_idx"
      ON "website_audits" USING btree ("created_at" DESC);
    CREATE INDEX IF NOT EXISTS "website_audits_overall_score_idx"
      ON "website_audits" USING btree ("overall_score");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "website_audits_status_idx";
    DROP INDEX IF EXISTS "website_audits_created_at_idx";
    DROP INDEX IF EXISTS "website_audits_overall_score_idx";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "website_audits" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_website_audits_status";
  `);
}
