/**
 * Additive: Revenue Pipeline foundation — research intake enrichment + sales opportunity linkage.
 *
 * Safety:
 * - ADD COLUMN / CREATE INDEX / soft FK only (IF NOT EXISTS).
 * - Does not drop or rewrite existing research_leads / sales_leads data.
 * - Historical Junior Creator rows remain valid with null new fields.
 *
 * Local apply only until production migration is explicitly authorized.
 * Note: production may prompt on Payload batch=-1 (dev-push marker); answer yes only when intended.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_sales_leads_next_action'
      ) THEN
        CREATE TYPE "public"."enum_sales_leads_next_action" AS ENUM(
          'respond-today',
          'follow-up-tomorrow',
          'waiting-on-prospect',
          'send-proposal',
          'review-scope',
          'none'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "research_leads"
      ADD COLUMN IF NOT EXISTS "business_name" varchar,
      ADD COLUMN IF NOT EXISTS "opportunity_url" varchar,
      ADD COLUMN IF NOT EXISTS "contact_email" varchar,
      ADD COLUMN IF NOT EXISTS "contact_phone" varchar,
      ADD COLUMN IF NOT EXISTS "promoted_sales_lead_id" integer,
      ADD COLUMN IF NOT EXISTS "promoted_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      ADD COLUMN IF NOT EXISTS "source_research_lead_id" integer,
      ADD COLUMN IF NOT EXISTS "sourced_by_junior_creator_id" integer,
      ADD COLUMN IF NOT EXISTS "sourced_by_name" varchar,
      ADD COLUMN IF NOT EXISTS "opportunity_url" varchar,
      ADD COLUMN IF NOT EXISTS "next_action" "public"."enum_sales_leads_next_action" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "next_action_note" varchar,
      ADD COLUMN IF NOT EXISTS "research_submitted_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'research_leads_promoted_sales_lead_id_fk'
      ) THEN
        ALTER TABLE "research_leads"
          ADD CONSTRAINT "research_leads_promoted_sales_lead_id_fk"
          FOREIGN KEY ("promoted_sales_lead_id") REFERENCES "public"."sales_leads"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_source_research_lead_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_source_research_lead_id_fk"
          FOREIGN KEY ("source_research_lead_id") REFERENCES "public"."research_leads"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_sourced_by_junior_creator_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_sourced_by_junior_creator_id_fk"
          FOREIGN KEY ("sourced_by_junior_creator_id") REFERENCES "public"."junior_creator_users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "sales_leads_source_research_lead_uidx"
      ON "sales_leads" ("source_research_lead_id")
      WHERE "source_research_lead_id" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "research_leads_promoted_sales_lead_idx"
      ON "research_leads" ("promoted_sales_lead_id");
    CREATE INDEX IF NOT EXISTS "sales_leads_sourced_by_junior_creator_idx"
      ON "sales_leads" ("sourced_by_junior_creator_id");
    CREATE INDEX IF NOT EXISTS "sales_leads_next_action_idx"
      ON "sales_leads" ("next_action");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "sales_leads_next_action_idx";
    DROP INDEX IF EXISTS "sales_leads_sourced_by_junior_creator_idx";
    DROP INDEX IF EXISTS "research_leads_promoted_sales_lead_idx";
    DROP INDEX IF EXISTS "sales_leads_source_research_lead_uidx";
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      DROP CONSTRAINT IF EXISTS "sales_leads_sourced_by_junior_creator_id_fk",
      DROP CONSTRAINT IF EXISTS "sales_leads_source_research_lead_id_fk";
    ALTER TABLE "research_leads"
      DROP CONSTRAINT IF EXISTS "research_leads_promoted_sales_lead_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      DROP COLUMN IF EXISTS "research_submitted_at",
      DROP COLUMN IF EXISTS "next_action_note",
      DROP COLUMN IF EXISTS "next_action",
      DROP COLUMN IF EXISTS "opportunity_url",
      DROP COLUMN IF EXISTS "sourced_by_name",
      DROP COLUMN IF EXISTS "sourced_by_junior_creator_id",
      DROP COLUMN IF EXISTS "source_research_lead_id";
    ALTER TABLE "research_leads"
      DROP COLUMN IF EXISTS "promoted_at",
      DROP COLUMN IF EXISTS "promoted_sales_lead_id",
      DROP COLUMN IF EXISTS "contact_phone",
      DROP COLUMN IF EXISTS "contact_email",
      DROP COLUMN IF EXISTS "opportunity_url",
      DROP COLUMN IF EXISTS "business_name";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_sales_leads_next_action";
  `);
}
