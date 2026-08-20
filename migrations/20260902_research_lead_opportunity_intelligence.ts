/**
 * Additive: Opportunity Intelligence fields on research_leads.
 *
 * - trigger_type
 * - event_date
 * - digital_gap
 * - recommended_channel
 * - urgency
 * - commercial_band
 *
 * Safety: CREATE TYPE / ADD COLUMN IF NOT EXISTS only. No backfill. No drops on up.
 * Existing research leads remain valid with null new fields.
 * Local apply only until production migration is authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_research_leads_trigger_type'
      ) THEN
        CREATE TYPE "public"."enum_research_leads_trigger_type" AS ENUM(
          'expansion',
          'second-location',
          'reopening',
          'new-ownership',
          'acquisition',
          'relocation',
          'renovation',
          'hiring',
          'advertising',
          'other'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_research_leads_recommended_channel'
      ) THEN
        CREATE TYPE "public"."enum_research_leads_recommended_channel" AS ENUM(
          'call',
          'email',
          'form',
          'linkedin',
          'social-dm',
          'referral'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_research_leads_urgency'
      ) THEN
        CREATE TYPE "public"."enum_research_leads_urgency" AS ENUM(
          'high',
          'medium',
          'low'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_research_leads_commercial_band'
      ) THEN
        CREATE TYPE "public"."enum_research_leads_commercial_band" AS ENUM(
          '7.5k-plus',
          '2.5-7.5k',
          '0.75-2.5k',
          'unclear'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "research_leads"
      ADD COLUMN IF NOT EXISTS "trigger_type" "public"."enum_research_leads_trigger_type",
      ADD COLUMN IF NOT EXISTS "event_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "digital_gap" varchar,
      ADD COLUMN IF NOT EXISTS "recommended_channel" "public"."enum_research_leads_recommended_channel",
      ADD COLUMN IF NOT EXISTS "urgency" "public"."enum_research_leads_urgency",
      ADD COLUMN IF NOT EXISTS "commercial_band" "public"."enum_research_leads_commercial_band";
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "research_leads_trigger_type_idx"
      ON "research_leads" USING btree ("trigger_type");
    CREATE INDEX IF NOT EXISTS "research_leads_urgency_idx"
      ON "research_leads" USING btree ("urgency");
    CREATE INDEX IF NOT EXISTS "research_leads_commercial_band_idx"
      ON "research_leads" USING btree ("commercial_band");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "research_leads_trigger_type_idx";
    DROP INDEX IF EXISTS "research_leads_urgency_idx";
    DROP INDEX IF EXISTS "research_leads_commercial_band_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "research_leads"
      DROP COLUMN IF EXISTS "trigger_type",
      DROP COLUMN IF EXISTS "event_date",
      DROP COLUMN IF EXISTS "digital_gap",
      DROP COLUMN IF EXISTS "recommended_channel",
      DROP COLUMN IF EXISTS "urgency",
      DROP COLUMN IF EXISTS "commercial_band";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_research_leads_trigger_type";
    DROP TYPE IF EXISTS "public"."enum_research_leads_recommended_channel";
    DROP TYPE IF EXISTS "public"."enum_research_leads_urgency";
    DROP TYPE IF EXISTS "public"."enum_research_leads_commercial_band";
  `);
}
