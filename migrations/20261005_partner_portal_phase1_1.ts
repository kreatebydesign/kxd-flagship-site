/**
 * Partner Portal Phase 1.1 — notes, earnings ledger expansion, calendar bookings, policy.
 * Additive only. Local apply until production migration is authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_partner_earnings_earning_type'
          AND e.enumlabel = 'retention_kicker'
      ) THEN
        ALTER TYPE "public"."enum_partner_earnings_earning_type" ADD VALUE 'retention_kicker';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_partner_earnings_earning_type'
          AND e.enumlabel = 'performance_bonus'
      ) THEN
        ALTER TYPE "public"."enum_partner_earnings_earning_type" ADD VALUE 'performance_bonus';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_partner_earnings_earning_type'
          AND e.enumlabel = 'adjustment'
      ) THEN
        ALTER TYPE "public"."enum_partner_earnings_earning_type" ADD VALUE 'adjustment';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_partner_earnings_payment_status'
          AND e.enumlabel = 'void'
      ) THEN
        ALTER TYPE "public"."enum_partner_earnings_payment_status" ADD VALUE 'void';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partner_booking_requests_booking_mode') THEN
        CREATE TYPE "public"."enum_partner_booking_requests_booking_mode"
          AS ENUM('request', 'calendar_slot');
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_partner_booking_requests_status'
          AND e.enumlabel = 'reschedule_requested'
      ) THEN
        ALTER TYPE "public"."enum_partner_booking_requests_status" ADD VALUE 'reschedule_requested';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_partner_booking_requests_status'
          AND e.enumlabel = 'cancel_requested'
      ) THEN
        ALTER TYPE "public"."enum_partner_booking_requests_status" ADD VALUE 'cancel_requested';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_partner_booking_requests_status'
          AND e.enumlabel = 'confirmed'
      ) THEN
        ALTER TYPE "public"."enum_partner_booking_requests_status" ADD VALUE 'confirmed';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "partner_earnings"
      ADD COLUMN IF NOT EXISTS "rate_bps" numeric,
      ADD COLUMN IF NOT EXISTS "eligible_collected_cents" numeric,
      ADD COLUMN IF NOT EXISTS "covered_service_month" numeric,
      ADD COLUMN IF NOT EXISTS "approved_by" varchar,
      ADD COLUMN IF NOT EXISTS "voided_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "partner_referral_notes" (
      "id" serial PRIMARY KEY NOT NULL,
      "referral_id" integer NOT NULL,
      "sourced_by_partner_id" integer NOT NULL,
      "sourced_by_partner_name" varchar NOT NULL,
      "body" varchar NOT NULL,
      "actor_display_name" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_referral_notes_referral_id_fk'
      ) THEN
        ALTER TABLE "partner_referral_notes"
          ADD CONSTRAINT "partner_referral_notes_referral_id_fk"
          FOREIGN KEY ("referral_id") REFERENCES "partner_referrals"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_referral_notes_partner_id_fk'
      ) THEN
        ALTER TABLE "partner_referral_notes"
          ADD CONSTRAINT "partner_referral_notes_partner_id_fk"
          FOREIGN KEY ("sourced_by_partner_id") REFERENCES "kxd_partner_profiles"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "partner_referral_notes_referral_idx"
      ON "partner_referral_notes" ("referral_id");
    CREATE INDEX IF NOT EXISTS "partner_referral_notes_partner_idx"
      ON "partner_referral_notes" ("sourced_by_partner_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "partner_commission_policies" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "active" boolean DEFAULT true,
      "project_rate_bps" numeric DEFAULT 1000 NOT NULL,
      "monthly_rate_bps" numeric DEFAULT 1000 NOT NULL,
      "monthly_bonus_months" numeric DEFAULT 3 NOT NULL,
      "retention_kicker_enabled" boolean DEFAULT true,
      "retention_kicker_rate_bps" numeric DEFAULT 1000 NOT NULL,
      "retention_kicker_month" numeric DEFAULT 4 NOT NULL,
      "eligible_recurring_services" varchar,
      "performance_bonus_enabled" boolean DEFAULT true,
      "performance_bonus_amount_cents" numeric DEFAULT 25000 NOT NULL,
      "performance_bonus_project_count" numeric DEFAULT 3 NOT NULL,
      "performance_bonus_window_days" numeric DEFAULT 90 NOT NULL,
      "operator_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "partner_commission_policies_key_uidx"
      ON "partner_commission_policies" ("key");
  `);

  await db.execute(sql`
    INSERT INTO "partner_commission_policies" (
      "key", "active", "project_rate_bps", "monthly_rate_bps", "monthly_bonus_months",
      "retention_kicker_enabled", "retention_kicker_rate_bps", "retention_kicker_month",
      "eligible_recurring_services", "performance_bonus_enabled",
      "performance_bonus_amount_cents", "performance_bonus_project_count",
      "performance_bonus_window_days"
    )
    SELECT
      'default', true, 1000, 1000, 3, true, 1000, 4,
      E'Website Care\nWebsite Management\nSEO & Growth',
      true, 25000, 3, 90
    WHERE NOT EXISTS (
      SELECT 1 FROM "partner_commission_policies" WHERE "key" = 'default'
    );
  `);

  await db.execute(sql`
    ALTER TABLE "partner_booking_requests"
      ADD COLUMN IF NOT EXISTS "booking_mode" "public"."enum_partner_booking_requests_booking_mode"
        DEFAULT 'request',
      ADD COLUMN IF NOT EXISTS "slot_start" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "slot_end" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "timezone" varchar,
      ADD COLUMN IF NOT EXISTS "google_event_id" varchar,
      ADD COLUMN IF NOT EXISTS "google_calendar_id" varchar,
      ADD COLUMN IF NOT EXISTS "meet_link" varchar,
      ADD COLUMN IF NOT EXISTS "prospect_invited" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "change_request_note" varchar;
  `);

  await db.execute(sql`
    ALTER TABLE "partner_booking_requests"
      ALTER COLUMN "preferred_times" DROP NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "partner_referral_notes" CASCADE;
    DROP TABLE IF EXISTS "partner_commission_policies" CASCADE;
  `);

  await db.execute(sql`
    ALTER TABLE "partner_earnings"
      DROP COLUMN IF EXISTS "rate_bps",
      DROP COLUMN IF EXISTS "eligible_collected_cents",
      DROP COLUMN IF EXISTS "covered_service_month",
      DROP COLUMN IF EXISTS "approved_by",
      DROP COLUMN IF EXISTS "voided_at";
  `);

  await db.execute(sql`
    ALTER TABLE "partner_booking_requests"
      DROP COLUMN IF EXISTS "booking_mode",
      DROP COLUMN IF EXISTS "slot_start",
      DROP COLUMN IF EXISTS "slot_end",
      DROP COLUMN IF EXISTS "timezone",
      DROP COLUMN IF EXISTS "google_event_id",
      DROP COLUMN IF EXISTS "google_calendar_id",
      DROP COLUMN IF EXISTS "meet_link",
      DROP COLUMN IF EXISTS "prospect_invited",
      DROP COLUMN IF EXISTS "change_request_note";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_partner_booking_requests_booking_mode";
  `);
}
