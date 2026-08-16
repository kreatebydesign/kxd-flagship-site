/**
 * Additive: Managed Client Lead Operations Phase 2 —
 * client-inquiries operational ledger (not KXD sales-leads, not CSI CRM).
 *
 * Safety:
 * - CREATE TABLE / enums / indexes IF NOT EXISTS.
 * - Soft FKs only.
 * - No historical backfill.
 * - No commission columns (commission stays on CSI).
 *
 * Local apply only until production migration is explicitly authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_channel') THEN
        CREATE TYPE "public"."enum_client_inquiries_channel" AS ENUM(
          'form', 'call', 'email', 'chat', 'walk_in', 'other'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_operational_status') THEN
        CREATE TYPE "public"."enum_client_inquiries_operational_status" AS ENUM(
          'new', 'acknowledged', 'in_progress', 'closed'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_disposition') THEN
        CREATE TYPE "public"."enum_client_inquiries_disposition" AS ENUM(
          'none', 'contacted', 'nurturing', 'appointment_set', 'not_interested',
          'unable_to_reach', 'spam', 'other'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_lead_quality') THEN
        CREATE TYPE "public"."enum_client_inquiries_lead_quality" AS ENUM(
          'unreviewed', 'high', 'medium', 'low', 'spam'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_verification_state') THEN
        CREATE TYPE "public"."enum_client_inquiries_verification_state" AS ENUM(
          'unverified', 'verified', 'rejected', 'spam', 'duplicate'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_qualification_state') THEN
        CREATE TYPE "public"."enum_client_inquiries_qualification_state" AS ENUM(
          'unreviewed', 'qualified', 'unqualified'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_outcome_state') THEN
        CREATE TYPE "public"."enum_client_inquiries_outcome_state" AS ENUM(
          'open', 'won', 'lost', 'no_response', 'not_applicable'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_reconciliation_state') THEN
        CREATE TYPE "public"."enum_client_inquiries_reconciliation_state" AS ENUM(
          'unlinked', 'matched', 'ads_without_inquiry', 'inquiry_without_ads', 'not_applicable'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_inquiries" (
      "id" serial PRIMARY KEY,
      "inquiry_key" varchar NOT NULL,
      "client_id" integer NOT NULL,
      "client_key" varchar NOT NULL,
      "channel" "public"."enum_client_inquiries_channel" NOT NULL DEFAULT 'form',
      "received_at" timestamp(3) with time zone NOT NULL,
      "destination_inbox" varchar,
      "landing_page" varchar,
      "campaign" varchar,
      "source_medium" varchar,
      "contact_name" varchar,
      "contact_email" varchar,
      "contact_phone" varchar,
      "message_summary" varchar,
      "assigned_owner_id" integer,
      "first_responded_at" timestamp(3) with time zone,
      "response_time_seconds" numeric,
      "operational_status" "public"."enum_client_inquiries_operational_status" NOT NULL DEFAULT 'new',
      "disposition" "public"."enum_client_inquiries_disposition" DEFAULT 'none',
      "lead_quality" "public"."enum_client_inquiries_lead_quality" DEFAULT 'unreviewed',
      "verification_state" "public"."enum_client_inquiries_verification_state" NOT NULL DEFAULT 'unverified',
      "verified_at" timestamp(3) with time zone,
      "verified_by_id" integer,
      "qualification_state" "public"."enum_client_inquiries_qualification_state" NOT NULL DEFAULT 'unreviewed',
      "outcome_state" "public"."enum_client_inquiries_outcome_state" NOT NULL DEFAULT 'open',
      "outcome_note" varchar,
      "confirmed_sale_reference" varchar,
      "source_system" varchar,
      "source_external_id" varchar,
      "source_client_site_event_id" integer,
      "reconciliation_state" "public"."enum_client_inquiries_reconciliation_state" NOT NULL DEFAULT 'unlinked',
      "google_conversion_observed" boolean DEFAULT false,
      "operator_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_inquiries_inquiry_key_uidx"
      ON "client_inquiries" ("inquiry_key");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_inquiries_source_csi_uidx"
      ON "client_inquiries" ("source_client_site_event_id")
      WHERE "source_client_site_event_id" IS NOT NULL;
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_inquiries_client_source_external_uidx"
      ON "client_inquiries" ("client_key", "source_external_id")
      WHERE "source_external_id" IS NOT NULL;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_client_id_idx"
      ON "client_inquiries" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_client_key_idx"
      ON "client_inquiries" ("client_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_received_at_idx"
      ON "client_inquiries" ("received_at");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_operational_status_idx"
      ON "client_inquiries" ("operational_status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_verification_state_idx"
      ON "client_inquiries" ("verification_state");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_qualification_state_idx"
      ON "client_inquiries" ("qualification_state");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_outcome_state_idx"
      ON "client_inquiries" ("outcome_state");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_reconciliation_state_idx"
      ON "client_inquiries" ("reconciliation_state");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_source_external_id_idx"
      ON "client_inquiries" ("source_external_id");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_inquiries_client_id_fk'
      ) THEN
        ALTER TABLE "client_inquiries"
          ADD CONSTRAINT "client_inquiries_client_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_inquiries_assigned_owner_id_fk'
      ) THEN
        ALTER TABLE "client_inquiries"
          ADD CONSTRAINT "client_inquiries_assigned_owner_id_fk"
          FOREIGN KEY ("assigned_owner_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_inquiries_verified_by_id_fk'
      ) THEN
        ALTER TABLE "client_inquiries"
          ADD CONSTRAINT "client_inquiries_verified_by_id_fk"
          FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_inquiries_source_csi_fk'
      ) THEN
        ALTER TABLE "client_inquiries"
          ADD CONSTRAINT "client_inquiries_source_csi_fk"
          FOREIGN KEY ("source_client_site_event_id") REFERENCES "public"."client_site_events"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_inquiries" DROP CONSTRAINT IF EXISTS "client_inquiries_source_csi_fk";
    ALTER TABLE "client_inquiries" DROP CONSTRAINT IF EXISTS "client_inquiries_verified_by_id_fk";
    ALTER TABLE "client_inquiries" DROP CONSTRAINT IF EXISTS "client_inquiries_assigned_owner_id_fk";
    ALTER TABLE "client_inquiries" DROP CONSTRAINT IF EXISTS "client_inquiries_client_id_fk";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_inquiries_source_external_id_idx";
    DROP INDEX IF EXISTS "client_inquiries_reconciliation_state_idx";
    DROP INDEX IF EXISTS "client_inquiries_outcome_state_idx";
    DROP INDEX IF EXISTS "client_inquiries_qualification_state_idx";
    DROP INDEX IF EXISTS "client_inquiries_verification_state_idx";
    DROP INDEX IF EXISTS "client_inquiries_operational_status_idx";
    DROP INDEX IF EXISTS "client_inquiries_received_at_idx";
    DROP INDEX IF EXISTS "client_inquiries_client_key_idx";
    DROP INDEX IF EXISTS "client_inquiries_client_id_idx";
    DROP INDEX IF EXISTS "client_inquiries_client_source_external_uidx";
    DROP INDEX IF EXISTS "client_inquiries_source_csi_uidx";
    DROP INDEX IF EXISTS "client_inquiries_inquiry_key_uidx";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "client_inquiries";`);
}
