/**
 * Partner Portal Phase 1 — additive partner identity, referrals, earnings, booking.
 * Local apply until production migration is authorized.
 * Does not mutate CES, client entitlements, or client-inquiries.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_portal_users_access_mode') THEN
        CREATE TYPE "public"."enum_portal_users_access_mode" AS ENUM('client', 'partner');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_kxd_partner_profiles_status') THEN
        CREATE TYPE "public"."enum_kxd_partner_profiles_status" AS ENUM('active', 'inactive');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partner_referrals_partner_visibility_state') THEN
        CREATE TYPE "public"."enum_partner_referrals_partner_visibility_state" AS ENUM(
          'submitted', 'reviewing', 'qualified', 'discovery_booked',
          'proposal_in_motion', 'won', 'not_moving_forward'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partner_referrals_internal_status') THEN
        CREATE TYPE "public"."enum_partner_referrals_internal_status" AS ENUM(
          'new', 'reviewing', 'qualified', 'in_conversation', 'closed'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partner_earnings_earning_type') THEN
        CREATE TYPE "public"."enum_partner_earnings_earning_type" AS ENUM(
          'project_commission', 'monthly_bonus'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partner_earnings_payment_status') THEN
        CREATE TYPE "public"."enum_partner_earnings_payment_status" AS ENUM(
          'pending_approval', 'approved', 'paid'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_partner_booking_requests_status') THEN
        CREATE TYPE "public"."enum_partner_booking_requests_status" AS ENUM(
          'submitted', 'scheduled', 'closed'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "portal_users"
      ADD COLUMN IF NOT EXISTS "access_mode" "public"."enum_portal_users_access_mode"
        DEFAULT 'client';
  `);

  await db.execute(sql`
    UPDATE "portal_users" SET "access_mode" = 'client' WHERE "access_mode" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "portal_users"
      ALTER COLUMN "access_mode" SET DEFAULT 'client',
      ALTER COLUMN "access_mode" SET NOT NULL;
  `);

  // Partners may have no client; client workspaces still require a client via app validate.
  await db.execute(sql`
    ALTER TABLE "portal_users" ALTER COLUMN "client_id" DROP NOT NULL;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "kxd_partner_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "portal_user_id" integer NOT NULL,
      "display_name" varchar NOT NULL,
      "status" "public"."enum_kxd_partner_profiles_status" DEFAULT 'active' NOT NULL,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'kxd_partner_profiles_portal_user_id_portal_users_id_fk'
      ) THEN
        ALTER TABLE "kxd_partner_profiles"
          ADD CONSTRAINT "kxd_partner_profiles_portal_user_id_portal_users_id_fk"
          FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "kxd_partner_profiles_portal_user_idx"
      ON "kxd_partner_profiles" ("portal_user_id");
    CREATE INDEX IF NOT EXISTS "kxd_partner_profiles_status_idx"
      ON "kxd_partner_profiles" ("status");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "partner_referrals" (
      "id" serial PRIMARY KEY NOT NULL,
      "sourced_by_partner_id" integer NOT NULL,
      "sourced_by_partner_name" varchar,
      "partner_visibility_state" "public"."enum_partner_referrals_partner_visibility_state"
        DEFAULT 'submitted' NOT NULL,
      "internal_status" "public"."enum_partner_referrals_internal_status"
        DEFAULT 'new' NOT NULL,
      "promoted_sales_lead_id" integer,
      "promoted_at" timestamp(3) with time zone,
      "business_name" varchar NOT NULL,
      "contact_name" varchar NOT NULL,
      "contact_role" varchar,
      "phone" varchar,
      "email" varchar,
      "website" varchar,
      "instagram_social" varchar,
      "industry" varchar,
      "what_they_want_more_of" varchar,
      "visible_problem_opportunity" varchar,
      "why_now" varchar,
      "decision_maker_confirmed" boolean DEFAULT false,
      "best_time_for_discovery_call" varchar,
      "partner_notes" varchar,
      "internal_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_referrals_sourced_by_partner_id_fk'
      ) THEN
        ALTER TABLE "partner_referrals"
          ADD CONSTRAINT "partner_referrals_sourced_by_partner_id_fk"
          FOREIGN KEY ("sourced_by_partner_id") REFERENCES "kxd_partner_profiles"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_referrals_promoted_sales_lead_id_fk'
      ) THEN
        ALTER TABLE "partner_referrals"
          ADD CONSTRAINT "partner_referrals_promoted_sales_lead_id_fk"
          FOREIGN KEY ("promoted_sales_lead_id") REFERENCES "sales_leads"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "partner_referrals_partner_idx"
      ON "partner_referrals" ("sourced_by_partner_id");
    CREATE INDEX IF NOT EXISTS "partner_referrals_visibility_idx"
      ON "partner_referrals" ("partner_visibility_state");
    CREATE INDEX IF NOT EXISTS "partner_referrals_created_at_idx"
      ON "partner_referrals" ("created_at" DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS "partner_referrals_promoted_sales_lead_uidx"
      ON "partner_referrals" ("promoted_sales_lead_id")
      WHERE "promoted_sales_lead_id" IS NOT NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      ADD COLUMN IF NOT EXISTS "source_partner_referral_id" integer,
      ADD COLUMN IF NOT EXISTS "sourced_by_partner_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_source_partner_referral_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_source_partner_referral_id_fk"
          FOREIGN KEY ("source_partner_referral_id") REFERENCES "partner_referrals"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_sourced_by_partner_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_sourced_by_partner_id_fk"
          FOREIGN KEY ("sourced_by_partner_id") REFERENCES "kxd_partner_profiles"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "sales_leads_source_partner_referral_uidx"
      ON "sales_leads" ("source_partner_referral_id")
      WHERE "source_partner_referral_id" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "sales_leads_sourced_by_partner_idx"
      ON "sales_leads" ("sourced_by_partner_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "partner_earnings" (
      "id" serial PRIMARY KEY NOT NULL,
      "partner_id" integer NOT NULL,
      "earning_type" "public"."enum_partner_earnings_earning_type" NOT NULL,
      "payment_status" "public"."enum_partner_earnings_payment_status"
        DEFAULT 'pending_approval' NOT NULL,
      "related_business_name" varchar NOT NULL,
      "amount_cents" numeric NOT NULL,
      "relevant_month" varchar,
      "related_sales_lead_id" integer,
      "related_partner_referral_id" integer,
      "approved_at" timestamp(3) with time zone,
      "paid_at" timestamp(3) with time zone,
      "operator_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_earnings_partner_id_fk'
      ) THEN
        ALTER TABLE "partner_earnings"
          ADD CONSTRAINT "partner_earnings_partner_id_fk"
          FOREIGN KEY ("partner_id") REFERENCES "kxd_partner_profiles"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_earnings_related_sales_lead_id_fk'
      ) THEN
        ALTER TABLE "partner_earnings"
          ADD CONSTRAINT "partner_earnings_related_sales_lead_id_fk"
          FOREIGN KEY ("related_sales_lead_id") REFERENCES "sales_leads"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_earnings_related_partner_referral_id_fk'
      ) THEN
        ALTER TABLE "partner_earnings"
          ADD CONSTRAINT "partner_earnings_related_partner_referral_id_fk"
          FOREIGN KEY ("related_partner_referral_id") REFERENCES "partner_referrals"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "partner_earnings_partner_idx"
      ON "partner_earnings" ("partner_id");
    CREATE INDEX IF NOT EXISTS "partner_earnings_payment_status_idx"
      ON "partner_earnings" ("payment_status");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "partner_booking_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "sourced_by_partner_id" integer NOT NULL,
      "sourced_by_partner_name" varchar,
      "status" "public"."enum_partner_booking_requests_status" DEFAULT 'submitted' NOT NULL,
      "preferred_times" varchar NOT NULL,
      "notes" varchar,
      "related_partner_referral_id" integer,
      "internal_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_booking_requests_partner_id_fk'
      ) THEN
        ALTER TABLE "partner_booking_requests"
          ADD CONSTRAINT "partner_booking_requests_partner_id_fk"
          FOREIGN KEY ("sourced_by_partner_id") REFERENCES "kxd_partner_profiles"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_booking_requests_referral_id_fk'
      ) THEN
        ALTER TABLE "partner_booking_requests"
          ADD CONSTRAINT "partner_booking_requests_referral_id_fk"
          FOREIGN KEY ("related_partner_referral_id") REFERENCES "partner_referrals"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "partner_booking_requests_partner_idx"
      ON "partner_booking_requests" ("sourced_by_partner_id");
    CREATE INDEX IF NOT EXISTS "partner_booking_requests_status_idx"
      ON "partner_booking_requests" ("status");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "partner_booking_requests" CASCADE;
    DROP TABLE IF EXISTS "partner_earnings" CASCADE;
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      DROP CONSTRAINT IF EXISTS "sales_leads_source_partner_referral_id_fk",
      DROP CONSTRAINT IF EXISTS "sales_leads_sourced_by_partner_id_fk";
    DROP INDEX IF EXISTS "sales_leads_source_partner_referral_uidx";
    DROP INDEX IF EXISTS "sales_leads_sourced_by_partner_idx";
    ALTER TABLE "sales_leads"
      DROP COLUMN IF EXISTS "source_partner_referral_id",
      DROP COLUMN IF EXISTS "sourced_by_partner_id";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "partner_referrals" CASCADE;
    DROP TABLE IF EXISTS "kxd_partner_profiles" CASCADE;
  `);

  await db.execute(sql`
    ALTER TABLE "portal_users" DROP COLUMN IF EXISTS "access_mode";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_partner_booking_requests_status";
    DROP TYPE IF EXISTS "public"."enum_partner_earnings_payment_status";
    DROP TYPE IF EXISTS "public"."enum_partner_earnings_earning_type";
    DROP TYPE IF EXISTS "public"."enum_partner_referrals_internal_status";
    DROP TYPE IF EXISTS "public"."enum_partner_referrals_partner_visibility_state";
    DROP TYPE IF EXISTS "public"."enum_kxd_partner_profiles_status";
    DROP TYPE IF EXISTS "public"."enum_portal_users_access_mode";
  `);
}
