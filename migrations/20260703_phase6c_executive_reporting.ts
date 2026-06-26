/**
 * KXD Core Phase 6C — Executive Reporting Engine
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_report_templates_category') THEN
        CREATE TYPE "public"."enum_report_templates_category"
          AS ENUM('standard', 'website-care', 'seo', 'growth', 'campaign', 'motorsports', 'contractor', 'hospitality');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_monthly_reports_status') THEN
        CREATE TYPE "public"."enum_monthly_reports_status"
          AS ENUM('draft', 'generating', 'ready', 'published');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "report_templates" (
      "id" serial PRIMARY KEY NOT NULL,
      "category" "public"."enum_report_templates_category" DEFAULT 'standard' NOT NULL,
      "active" boolean DEFAULT true,
      "sort_order" numeric DEFAULT 0,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "description" varchar,
      "sections" jsonb,
      "edition" varchar DEFAULT 'kxd-core',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "report_templates_slug_idx" ON "report_templates" ("slug");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_reports" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar,
      "status" "public"."enum_monthly_reports_status" DEFAULT 'draft' NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "template_id" integer REFERENCES "report_templates"("id") ON DELETE SET NULL,
      "reporting_month" numeric NOT NULL,
      "reporting_year" numeric NOT NULL,
      "version" numeric DEFAULT 1,
      "prepared_by" varchar,
      "approved_by" varchar,
      "published_at" timestamp(3) with time zone,
      "view_count" numeric DEFAULT 0,
      "executive_summary" varchar,
      "work_completed" varchar,
      "notes" varchar,
      "next_month_priorities" jsonb,
      "deliverables" jsonb,
      "projects" jsonb,
      "meetings" jsonb,
      "website_health" jsonb,
      "infrastructure" jsonb,
      "growth" jsonb,
      "recommendations" jsonb,
      "kpis" jsonb,
      "traffic" jsonb,
      "conversions" jsonb,
      "seo" jsonb,
      "connector_status" jsonb,
      "timeline" jsonb,
      "report_data" jsonb,
      "html_export" varchar,
      "portal_html" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "monthly_reports_client_idx" ON "monthly_reports" ("client_id");
    CREATE INDEX IF NOT EXISTS "monthly_reports_status_idx" ON "monthly_reports" ("status");
    CREATE INDEX IF NOT EXISTS "monthly_reports_period_idx" ON "monthly_reports" ("reporting_year" DESC, "reporting_month" DESC);
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "report_templates_id" integer,
      ADD COLUMN IF NOT EXISTS "monthly_reports_id" integer;
  `);

  await db.execute(sql`
    INSERT INTO "report_templates" ("category", "active", "sort_order", "title", "slug", "description", "sections", "edition")
    SELECT * FROM (VALUES
      ('standard'::"public"."enum_report_templates_category", true, 10, 'Standard Monthly Report', 'standard-monthly', 'Full executive monthly report for KXD Core clients.', '["executiveSummary","workCompleted","deliverables","projects","meetings","websiteHealth","infrastructure","growth","recommendations","kpis","timeline","nextMonthPriorities"]'::jsonb, 'kxd-core'),
      ('website-care', true, 20, 'Website Care Report', 'website-care', 'Website maintenance and care summary.', '["executiveSummary","workCompleted","deliverables","websiteHealth","infrastructure","kpis"]'::jsonb, 'kxd-core'),
      ('seo', true, 30, 'SEO Report', 'seo-report', 'Search performance and SEO recommendations.', '["executiveSummary","seo","websiteHealth","growth","recommendations"]'::jsonb, 'kxd-core'),
      ('growth', true, 40, 'Growth Report', 'growth-report', 'Growth opportunities and strategic priorities.', '["executiveSummary","growth","recommendations","kpis"]'::jsonb, 'kxd-core'),
      ('campaign', true, 50, 'Campaign Report', 'campaign-report', 'Campaign OS monthly report.', '["executiveSummary","workCompleted","deliverables","growth","timeline"]'::jsonb, 'campaign-os'),
      ('motorsports', true, 60, 'Motorsports Report', 'motorsports-report', 'Motorsports OS client report.', '["executiveSummary","projects","deliverables","timeline","kpis"]'::jsonb, 'motorsports-os'),
      ('contractor', true, 70, 'Contractor Report', 'contractor-report', 'Contractor OS monthly report.', '["executiveSummary","projects","deliverables","infrastructure"]'::jsonb, 'contractor-os'),
      ('hospitality', true, 80, 'Hospitality Report', 'hospitality-report', 'Hospitality OS monthly report.', '["executiveSummary","growth","websiteHealth","recommendations"]'::jsonb, 'hospitality-os')
    ) AS v(category, active, sort_order, title, slug, description, sections, edition)
    WHERE NOT EXISTS (SELECT 1 FROM "report_templates" LIMIT 1);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "monthly_reports_id",
      DROP COLUMN IF EXISTS "report_templates_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "monthly_reports" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "report_templates" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_monthly_reports_status";
    DROP TYPE IF EXISTS "public"."enum_report_templates_category";
  `);
}
