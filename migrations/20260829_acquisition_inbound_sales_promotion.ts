/**
 * Additive: Acquisition & Lead Operations Phase 1 —
 * inbound intake → canonical sales-leads provenance + duplicate protection.
 *
 * Safety:
 * - ADD COLUMN / CREATE INDEX / soft FK only (IF NOT EXISTS).
 * - Does not drop or rewrite existing sales/inbound data.
 * - No historical backfill of source relationships.
 *
 * Local apply only until production migration is explicitly authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sales_leads"
      ADD COLUMN IF NOT EXISTS "source_inquiry_id" integer,
      ADD COLUMN IF NOT EXISTS "source_project_inquiry_id" integer,
      ADD COLUMN IF NOT EXISTS "source_website_audit_id" integer;
  `);

  await db.execute(sql`
    ALTER TABLE "inquiries"
      ADD COLUMN IF NOT EXISTS "referral" varchar,
      ADD COLUMN IF NOT EXISTS "promoted_sales_lead_id" integer,
      ADD COLUMN IF NOT EXISTS "promoted_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    ALTER TABLE "project_inquiries"
      ADD COLUMN IF NOT EXISTS "promoted_sales_lead_id" integer,
      ADD COLUMN IF NOT EXISTS "promoted_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    ALTER TABLE "website_audits"
      ADD COLUMN IF NOT EXISTS "promoted_sales_lead_id" integer,
      ADD COLUMN IF NOT EXISTS "promoted_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_source_inquiry_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_source_inquiry_id_fk"
          FOREIGN KEY ("source_inquiry_id") REFERENCES "public"."inquiries"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_source_project_inquiry_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_source_project_inquiry_id_fk"
          FOREIGN KEY ("source_project_inquiry_id") REFERENCES "public"."project_inquiries"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_source_website_audit_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_source_website_audit_id_fk"
          FOREIGN KEY ("source_website_audit_id") REFERENCES "public"."website_audits"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_promoted_sales_lead_id_fk'
      ) THEN
        ALTER TABLE "inquiries"
          ADD CONSTRAINT "inquiries_promoted_sales_lead_id_fk"
          FOREIGN KEY ("promoted_sales_lead_id") REFERENCES "public"."sales_leads"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'project_inquiries_promoted_sales_lead_id_fk'
      ) THEN
        ALTER TABLE "project_inquiries"
          ADD CONSTRAINT "project_inquiries_promoted_sales_lead_id_fk"
          FOREIGN KEY ("promoted_sales_lead_id") REFERENCES "public"."sales_leads"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'website_audits_promoted_sales_lead_id_fk'
      ) THEN
        ALTER TABLE "website_audits"
          ADD CONSTRAINT "website_audits_promoted_sales_lead_id_fk"
          FOREIGN KEY ("promoted_sales_lead_id") REFERENCES "public"."sales_leads"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "sales_leads_source_inquiry_uidx"
      ON "sales_leads" ("source_inquiry_id")
      WHERE "source_inquiry_id" IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "sales_leads_source_project_inquiry_uidx"
      ON "sales_leads" ("source_project_inquiry_id")
      WHERE "source_project_inquiry_id" IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "sales_leads_source_website_audit_uidx"
      ON "sales_leads" ("source_website_audit_id")
      WHERE "source_website_audit_id" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "inquiries_promoted_sales_lead_idx"
      ON "inquiries" ("promoted_sales_lead_id");
    CREATE INDEX IF NOT EXISTS "project_inquiries_promoted_sales_lead_idx"
      ON "project_inquiries" ("promoted_sales_lead_id");
    CREATE INDEX IF NOT EXISTS "website_audits_promoted_sales_lead_idx"
      ON "website_audits" ("promoted_sales_lead_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "website_audits_promoted_sales_lead_idx";
    DROP INDEX IF EXISTS "project_inquiries_promoted_sales_lead_idx";
    DROP INDEX IF EXISTS "inquiries_promoted_sales_lead_idx";
    DROP INDEX IF EXISTS "sales_leads_source_website_audit_uidx";
    DROP INDEX IF EXISTS "sales_leads_source_project_inquiry_uidx";
    DROP INDEX IF EXISTS "sales_leads_source_inquiry_uidx";
  `);

  await db.execute(sql`
    ALTER TABLE "website_audits"
      DROP CONSTRAINT IF EXISTS "website_audits_promoted_sales_lead_id_fk";
    ALTER TABLE "project_inquiries"
      DROP CONSTRAINT IF EXISTS "project_inquiries_promoted_sales_lead_id_fk";
    ALTER TABLE "inquiries"
      DROP CONSTRAINT IF EXISTS "inquiries_promoted_sales_lead_id_fk";
    ALTER TABLE "sales_leads"
      DROP CONSTRAINT IF EXISTS "sales_leads_source_website_audit_id_fk",
      DROP CONSTRAINT IF EXISTS "sales_leads_source_project_inquiry_id_fk",
      DROP CONSTRAINT IF EXISTS "sales_leads_source_inquiry_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "website_audits"
      DROP COLUMN IF EXISTS "promoted_at",
      DROP COLUMN IF EXISTS "promoted_sales_lead_id";
    ALTER TABLE "project_inquiries"
      DROP COLUMN IF EXISTS "promoted_at",
      DROP COLUMN IF EXISTS "promoted_sales_lead_id";
    ALTER TABLE "inquiries"
      DROP COLUMN IF EXISTS "promoted_at",
      DROP COLUMN IF EXISTS "promoted_sales_lead_id",
      DROP COLUMN IF EXISTS "referral";
    ALTER TABLE "sales_leads"
      DROP COLUMN IF EXISTS "source_website_audit_id",
      DROP COLUMN IF EXISTS "source_project_inquiry_id",
      DROP COLUMN IF EXISTS "source_inquiry_id";
  `);
}
