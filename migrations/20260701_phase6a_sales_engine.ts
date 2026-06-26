/**
 * KXD Core Phase 6A — Proposal & Sales Engine
 * sales_leads, proposals, proposal_sections, sales_activities
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sales_leads_status') THEN
        CREATE TYPE "public"."enum_sales_leads_status"
          AS ENUM('new', 'discovery', 'proposal', 'negotiation', 'won', 'lost', 'nurturing');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposals_status') THEN
        CREATE TYPE "public"."enum_proposals_status"
          AS ENUM('draft', 'sent', 'viewed', 'approved', 'rejected', 'expired');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_sections_category') THEN
        CREATE TYPE "public"."enum_proposal_sections_category"
          AS ENUM(
            'about-kxd', 'discovery', 'branding', 'website', 'seo',
            'monthly-care', 'crm', 'automation', 'marketing', 'general'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sales_activities_activity_type') THEN
        CREATE TYPE "public"."enum_sales_activities_activity_type"
          AS ENUM(
            'call', 'meeting', 'email', 'proposal-sent', 'proposal-viewed',
            'follow-up', 'note'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sales_leads" (
      "id" serial PRIMARY KEY NOT NULL,
      "status" "public"."enum_sales_leads_status" DEFAULT 'new' NOT NULL,
      "source" varchar,
      "assigned_to" varchar,
      "company_name" varchar NOT NULL,
      "contact_name" varchar NOT NULL,
      "email" varchar,
      "phone" varchar,
      "website" varchar,
      "industry" varchar,
      "tags" varchar,
      "notes" varchar,
      "estimated_value" numeric,
      "estimated_mrr" numeric,
      "probability" numeric DEFAULT 25,
      "next_follow_up" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposal_sections" (
      "id" serial PRIMARY KEY NOT NULL,
      "category" "public"."enum_proposal_sections_category" DEFAULT 'general' NOT NULL,
      "active" boolean DEFAULT true,
      "is_recurring" boolean DEFAULT false,
      "sort_order" numeric DEFAULT 0,
      "title" varchar NOT NULL,
      "slug" varchar,
      "content" varchar NOT NULL,
      "default_price" numeric,
      "summary" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposals" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_number" varchar NOT NULL,
      "status" "public"."enum_proposals_status" DEFAULT 'draft' NOT NULL,
      "lead_id" integer REFERENCES "sales_leads"("id") ON DELETE SET NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "title" varchar NOT NULL,
      "executive_summary" varchar,
      "scope" varchar,
      "deliverables" varchar,
      "timeline" varchar,
      "terms" varchar,
      "section_blocks" jsonb,
      "optional_services" jsonb,
      "signature_placeholder" varchar DEFAULT 'Authorized signature · Date',
      "approval_placeholder" varchar DEFAULT 'Client approval · Date',
      "investment" numeric,
      "recurring_amount" numeric,
      "investment_summary" varchar,
      "expires_at" timestamp(3) with time zone,
      "viewed_at" timestamp(3) with time zone,
      "approved_at" timestamp(3) with time zone,
      "conversion_prepared_at" timestamp(3) with time zone,
      "conversion_draft" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "proposals_proposal_number_idx"
      ON "proposals" USING btree ("proposal_number");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sales_activities" (
      "id" serial PRIMARY KEY NOT NULL,
      "activity_type" "public"."enum_sales_activities_activity_type" DEFAULT 'note' NOT NULL,
      "lead_id" integer REFERENCES "sales_leads"("id") ON DELETE SET NULL,
      "proposal_id" integer REFERENCES "proposals"("id") ON DELETE SET NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "title" varchar NOT NULL,
      "summary" varchar,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "timeline_published" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sales_leads_status_idx" ON "sales_leads" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "sales_leads_created_at_idx" ON "sales_leads" USING btree ("created_at" DESC);
    CREATE INDEX IF NOT EXISTS "proposals_status_idx" ON "proposals" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "proposals_lead_idx" ON "proposals" USING btree ("lead_id");
    CREATE INDEX IF NOT EXISTS "proposals_client_idx" ON "proposals" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "proposal_sections_category_idx" ON "proposal_sections" USING btree ("category");
    CREATE INDEX IF NOT EXISTS "sales_activities_occurred_at_idx" ON "sales_activities" USING btree ("occurred_at" DESC);
    CREATE INDEX IF NOT EXISTS "sales_activities_lead_idx" ON "sales_activities" USING btree ("lead_id");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "sales_leads_id" integer,
      ADD COLUMN IF NOT EXISTS "proposals_id" integer,
      ADD COLUMN IF NOT EXISTS "proposal_sections_id" integer,
      ADD COLUMN IF NOT EXISTS "sales_activities_id" integer;
  `);

  await db.execute(sql`
    INSERT INTO "proposal_sections" ("category", "active", "is_recurring", "sort_order", "title", "slug", "content", "default_price", "summary")
    SELECT * FROM (VALUES
      ('about-kxd'::"public"."enum_proposal_sections_category", true, false, 10, 'About KXD', 'about-kxd',
        'Kreate by Design is a creative operations studio built for brands that expect precision, velocity, and long-term partnership.', NULL,
        'Studio positioning and partnership philosophy.'),
      ('discovery', true, false, 20, 'Discovery', 'discovery',
        'Structured discovery to align goals, audience, constraints, and success metrics before production begins.', 2500,
        'Discovery sprint and strategic alignment.'),
      ('branding', true, false, 30, 'Branding', 'branding',
        'Identity system, voice, visual language, and brand guidelines engineered for consistent market presence.', 8500,
        'Brand identity and guidelines.'),
      ('website', true, false, 40, 'Website', 'website',
        'Premium editorial web experience — design, build, CMS integration, and launch support.', 12000,
        'Website design and development.'),
      ('seo', true, true, 50, 'SEO', 'seo',
        'Technical SEO, on-page optimization, and ongoing search performance monitoring.', 1500,
        'Search optimization — monthly.'),
      ('monthly-care', true, true, 60, 'Monthly Care', 'monthly-care',
        'Ongoing updates, performance monitoring, content support, and proactive maintenance.', 2000,
        'Retainer-style monthly care.'),
      ('crm', true, false, 70, 'CRM', 'crm',
        'CRM architecture, pipeline setup, and team adoption for consistent follow-through.', 4500,
        'CRM setup and configuration.'),
      ('automation', true, false, 80, 'Automation', 'automation',
        'Workflow automation across sales, onboarding, and delivery — reducing manual overhead.', 3500,
        'Business process automation.'),
      ('marketing', true, true, 90, 'Marketing', 'marketing',
        'Campaign creative, channel strategy, and performance reporting on a recurring basis.', 3000,
        'Marketing support — monthly.')
    ) AS v(category, active, is_recurring, sort_order, title, slug, content, default_price, summary)
    WHERE NOT EXISTS (SELECT 1 FROM "proposal_sections" LIMIT 1);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "sales_activities_id",
      DROP COLUMN IF EXISTS "proposal_sections_id",
      DROP COLUMN IF EXISTS "proposals_id",
      DROP COLUMN IF EXISTS "sales_leads_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "sales_activities" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "proposals" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "proposal_sections" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "sales_leads" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_sales_activities_activity_type";
    DROP TYPE IF EXISTS "public"."enum_proposal_sections_category";
    DROP TYPE IF EXISTS "public"."enum_proposals_status";
    DROP TYPE IF EXISTS "public"."enum_sales_leads_status";
  `);
}
