/**
 * Primal Phase 1 — Lead Command foundation schema (Build 1).
 *
 * Additive only:
 * - New `client_locations` table (operator-only structural locations).
 * - New columns on `client_inquiries`: nextFollowUpAt, programInterest,
 *   utm* fields, gclid, keyword, lostReason, wonRevenueCents, bookedProgram,
 *   location (FK → client_locations), assignedPortalOwner (FK → portal_users).
 *
 * Safety:
 * - CREATE TABLE / CREATE TYPE / ADD COLUMN all IF NOT EXISTS.
 * - Soft FKs only (SET NULL on delete).
 * - No backfill. No destructive changes.
 *
 * Local apply only until production migration is explicitly authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── client_locations ──────────────────────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_locations_status') THEN
        CREATE TYPE "public"."enum_client_locations_status" AS ENUM('active', 'planned');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_locations" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL,
      "name" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "status" "public"."enum_client_locations_status" DEFAULT 'active' NOT NULL,
      "is_public" boolean DEFAULT false,
      "region" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_locations_client_id_fk'
      ) THEN
        ALTER TABLE "client_locations"
          ADD CONSTRAINT "client_locations_client_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_locations_client_id_idx" ON "client_locations" ("client_id");
    CREATE INDEX IF NOT EXISTS "client_locations_status_idx" ON "client_locations" ("status");
    CREATE UNIQUE INDEX IF NOT EXISTS "client_locations_client_slug_uidx" ON "client_locations" ("client_id", "slug");
  `);

  // ── client_inquiries additive fields ─────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_lost_reason'
      ) THEN
        CREATE TYPE "public"."enum_client_inquiries_lost_reason" AS ENUM(
          'not_interested', 'budget', 'timing', 'competitor', 'no_response', 'wrong_fit', 'other'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_inquiries"
      ADD COLUMN IF NOT EXISTS "next_follow_up_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "program_interest" varchar,
      ADD COLUMN IF NOT EXISTS "utm_source" varchar,
      ADD COLUMN IF NOT EXISTS "utm_medium" varchar,
      ADD COLUMN IF NOT EXISTS "utm_campaign" varchar,
      ADD COLUMN IF NOT EXISTS "utm_content" varchar,
      ADD COLUMN IF NOT EXISTS "utm_term" varchar,
      ADD COLUMN IF NOT EXISTS "gclid" varchar,
      ADD COLUMN IF NOT EXISTS "keyword" varchar,
      ADD COLUMN IF NOT EXISTS "lost_reason" "public"."enum_client_inquiries_lost_reason",
      ADD COLUMN IF NOT EXISTS "won_revenue_cents" numeric,
      ADD COLUMN IF NOT EXISTS "booked_program" varchar,
      ADD COLUMN IF NOT EXISTS "location_id" integer,
      ADD COLUMN IF NOT EXISTS "assigned_portal_owner_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_inquiries_location_id_fk'
      ) THEN
        ALTER TABLE "client_inquiries"
          ADD CONSTRAINT "client_inquiries_location_id_fk"
          FOREIGN KEY ("location_id") REFERENCES "public"."client_locations"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_inquiries_assigned_portal_owner_id_fk'
      ) THEN
        ALTER TABLE "client_inquiries"
          ADD CONSTRAINT "client_inquiries_assigned_portal_owner_id_fk"
          FOREIGN KEY ("assigned_portal_owner_id") REFERENCES "public"."portal_users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_next_follow_up_at_idx" ON "client_inquiries" ("next_follow_up_at");
    CREATE INDEX IF NOT EXISTS "client_inquiries_location_id_idx" ON "client_inquiries" ("location_id");
    CREATE INDEX IF NOT EXISTS "client_inquiries_assigned_portal_owner_id_idx" ON "client_inquiries" ("assigned_portal_owner_id");
    CREATE INDEX IF NOT EXISTS "client_inquiries_lost_reason_idx" ON "client_inquiries" ("lost_reason");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_inquiries" DROP CONSTRAINT IF EXISTS "client_inquiries_assigned_portal_owner_id_fk";
    ALTER TABLE "client_inquiries" DROP CONSTRAINT IF EXISTS "client_inquiries_location_id_fk";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_inquiries_lost_reason_idx";
    DROP INDEX IF EXISTS "client_inquiries_assigned_portal_owner_id_idx";
    DROP INDEX IF EXISTS "client_inquiries_location_id_idx";
    DROP INDEX IF EXISTS "client_inquiries_next_follow_up_at_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "client_inquiries"
      DROP COLUMN IF EXISTS "assigned_portal_owner_id",
      DROP COLUMN IF EXISTS "location_id",
      DROP COLUMN IF EXISTS "booked_program",
      DROP COLUMN IF EXISTS "won_revenue_cents",
      DROP COLUMN IF EXISTS "lost_reason",
      DROP COLUMN IF EXISTS "keyword",
      DROP COLUMN IF EXISTS "gclid",
      DROP COLUMN IF EXISTS "utm_term",
      DROP COLUMN IF EXISTS "utm_content",
      DROP COLUMN IF EXISTS "utm_campaign",
      DROP COLUMN IF EXISTS "utm_medium",
      DROP COLUMN IF EXISTS "utm_source",
      DROP COLUMN IF EXISTS "program_interest",
      DROP COLUMN IF EXISTS "next_follow_up_at";
  `);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_inquiries_lost_reason";`);

  await db.execute(sql`
    DROP INDEX IF EXISTS "client_locations_client_slug_uidx";
    DROP INDEX IF EXISTS "client_locations_status_idx";
    DROP INDEX IF EXISTS "client_locations_client_id_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "client_locations" DROP CONSTRAINT IF EXISTS "client_locations_client_id_fk";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "client_locations";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_locations_status";`);
}
