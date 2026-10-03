import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_calendar_events_event_type" AS ENUM(
        'main_event', 'practice', 'test_day', 'prep', 'school', 'race', 'briefing', 'private', 'support', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_calendar_events_status" AS ENUM(
        'draft', 'scheduled', 'cancelled', 'postponed', 'completed'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_calendar_events_source_system" AS ENUM(
        'manual', 'motorsportreg', 'radical', 'external'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_calendar_events_source_presence" AS ENUM(
        'present', 'missing_from_feed'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_calendar_events_relationship_kind" AS ENUM(
        'none', 'practice', 'test_day', 'prep', 'briefing', 'support', 'related'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_calendar_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "event_key" varchar NOT NULL,
      "title_override" varchar,
      "source_title" varchar NOT NULL,
      "summary" varchar,
      "description" varchar,
      "event_type" "enum_client_calendar_events_event_type" DEFAULT 'other' NOT NULL,
      "source_event_type" varchar,
      "starts_on" timestamp(3) with time zone NOT NULL,
      "ends_on" timestamp(3) with time zone,
      "timezone" varchar DEFAULT 'America/New_York',
      "all_day" boolean DEFAULT true,
      "status" "enum_client_calendar_events_status" DEFAULT 'draft' NOT NULL,
      "listed_on_website" boolean DEFAULT false,
      "featured" boolean DEFAULT false,
      "venue_name" varchar,
      "venue_city" varchar,
      "venue_state" varchar,
      "venue_address" varchar,
      "source_system" "enum_client_calendar_events_source_system" DEFAULT 'manual' NOT NULL,
      "source_external_id" varchar,
      "source_url" varchar,
      "source_last_synced_at" timestamp(3) with time zone,
      "source_presence" "enum_client_calendar_events_source_presence" DEFAULT 'present',
      "field_authority" jsonb,
      "relationship_kind" "enum_client_calendar_events_relationship_kind" DEFAULT 'none',
      "practice_notes" varchar,
      "registration_guidance" varchar,
      "activity_log" jsonb,
      "created_by" varchar,
      "updated_by" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "client_id" integer,
      "location_id" integer,
      "parent_event_id" integer
    );
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_calendar_events_client_id_clients_id_fk'
      ) THEN
        ALTER TABLE "client_calendar_events"
          ADD CONSTRAINT "client_calendar_events_client_id_clients_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "clients"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_calendar_events_client_event_key"
      ON "client_calendar_events" ("client_id", "event_key");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_calendar_events_client_source_identity"
      ON "client_calendar_events" ("client_id", "source_system", "source_external_id")
      WHERE "source_external_id" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "client_calendar_events";`);
}
