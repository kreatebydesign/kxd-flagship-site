/**
 * KXD OS Phase 1 — research_leads table (Lead Research Desk)
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_research_leads_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_research_leads_status"
          AS ENUM('new', 'reviewing', 'qualified', 'rejected', 'contacted', 'closed-won', 'closed-lost');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_research_leads_estimated_service' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_research_leads_estimated_service"
          AS ENUM('website', 'branding', 'seo', 'marketing', 'crm', 'automation', 'other');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "research_leads" (
      "id"                  serial PRIMARY KEY NOT NULL,
      "researcher_name"     varchar NOT NULL,
      "source"              varchar DEFAULT 'Craigslist',
      "state"               varchar,
      "city"                varchar,
      "lead_url"            varchar,
      "category"            varchar,
      "estimated_service"   "public"."enum_research_leads_estimated_service",
      "notes"               varchar,
      "status"              "public"."enum_research_leads_status" DEFAULT 'new' NOT NULL,
      "updated_at"          timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"          timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "research_leads_status_idx"
      ON "research_leads" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "research_leads_created_at_idx"
      ON "research_leads" USING btree ("created_at" DESC);
    CREATE INDEX IF NOT EXISTS "research_leads_researcher_name_idx"
      ON "research_leads" USING btree ("researcher_name");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "research_leads_status_idx";
    DROP INDEX IF EXISTS "research_leads_created_at_idx";
    DROP INDEX IF EXISTS "research_leads_researcher_name_idx";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "research_leads" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_research_leads_estimated_service";
    DROP TYPE IF EXISTS "public"."enum_research_leads_status";
  `);
}
