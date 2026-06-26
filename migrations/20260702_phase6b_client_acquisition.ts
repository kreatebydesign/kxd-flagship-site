/**
 * KXD Core Phase 6B — Client Acquisition Engine
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposals_approval_status') THEN
        CREATE TYPE "public"."enum_proposals_approval_status"
          AS ENUM('none', 'changes-requested', 'declined', 'pending-payment', 'ready');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposals_deposit_type') THEN
        CREATE TYPE "public"."enum_proposals_deposit_type"
          AS ENUM('none', 'percent-25', 'percent-50', 'custom-percent', 'fixed', 'full');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposals_payment_status') THEN
        CREATE TYPE "public"."enum_proposals_payment_status"
          AS ENUM('none', 'pending', 'deposit-paid', 'paid', 'failed');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_view_events_event_type') THEN
        CREATE TYPE "public"."enum_proposal_view_events_event_type"
          AS ENUM('page-view', 'section-view', 'heartbeat', 'session-end');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "proposals"
      ADD COLUMN IF NOT EXISTS "approval_status" "public"."enum_proposals_approval_status" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "revoked" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "faqs" jsonb,
      ADD COLUMN IF NOT EXISTS "agreement_text" varchar,
      ADD COLUMN IF NOT EXISTS "agreement_version" varchar DEFAULT '1.0',
      ADD COLUMN IF NOT EXISTS "deposit_type" "public"."enum_proposals_deposit_type" DEFAULT 'percent-50',
      ADD COLUMN IF NOT EXISTS "deposit_percent" numeric,
      ADD COLUMN IF NOT EXISTS "deposit_fixed_amount" numeric,
      ADD COLUMN IF NOT EXISTS "deposit_required" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "public_token" varchar,
      ADD COLUMN IF NOT EXISTS "public_token_expires_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "sent_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "payment_status" "public"."enum_proposals_payment_status" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "payment_intent_id" varchar,
      ADD COLUMN IF NOT EXISTS "checkout_session_id" varchar,
      ADD COLUMN IF NOT EXISTS "paid_amount" numeric,
      ADD COLUMN IF NOT EXISTS "remaining_balance" numeric,
      ADD COLUMN IF NOT EXISTS "payment_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "subscription_prepared" jsonb,
      ADD COLUMN IF NOT EXISTS "first_viewed_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "last_viewed_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "total_views" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "total_time_on_proposal_seconds" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "viewed_sections_summary" jsonb,
      ADD COLUMN IF NOT EXISTS "conversion_executed_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "conversion_client_id" integer,
      ADD COLUMN IF NOT EXISTS "archived_in_portal" boolean DEFAULT false;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "proposals_public_token_idx"
      ON "proposals" USING btree ("public_token");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposal_agreements" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_id" integer NOT NULL REFERENCES "proposals"("id") ON DELETE CASCADE,
      "agreement_version" varchar NOT NULL,
      "signer_name" varchar NOT NULL,
      "signer_email" varchar NOT NULL,
      "company" varchar,
      "signature_image" varchar,
      "signed_at" timestamp(3) with time zone NOT NULL,
      "ip_address" varchar,
      "user_agent" varchar,
      "acceptance_hash" varchar,
      "accepted_terms_version" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposal_view_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_id" integer NOT NULL REFERENCES "proposals"("id") ON DELETE CASCADE,
      "event_type" "public"."enum_proposal_view_events_event_type" NOT NULL,
      "section_id" varchar,
      "duration_seconds" numeric,
      "device_type" varchar,
      "browser" varchar,
      "approximate_location" varchar,
      "user_agent" varchar,
      "ip_address" varchar,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "proposal_agreements_proposal_idx" ON "proposal_agreements" ("proposal_id");
    CREATE INDEX IF NOT EXISTS "proposal_view_events_proposal_idx" ON "proposal_view_events" ("proposal_id");
    CREATE INDEX IF NOT EXISTS "proposal_view_events_occurred_at_idx" ON "proposal_view_events" ("occurred_at" DESC);
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "proposal_agreements_id" integer,
      ADD COLUMN IF NOT EXISTS "proposal_view_events_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "proposal_view_events_id",
      DROP COLUMN IF EXISTS "proposal_agreements_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "proposal_view_events" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "proposal_agreements" CASCADE;`);
  await db.execute(sql`DROP INDEX IF EXISTS "proposals_public_token_idx";`);
  await db.execute(sql`
    ALTER TABLE "proposals"
      DROP COLUMN IF EXISTS "archived_in_portal",
      DROP COLUMN IF EXISTS "conversion_client_id",
      DROP COLUMN IF EXISTS "conversion_executed_at",
      DROP COLUMN IF EXISTS "viewed_sections_summary",
      DROP COLUMN IF EXISTS "total_time_on_proposal_seconds",
      DROP COLUMN IF EXISTS "total_views",
      DROP COLUMN IF EXISTS "last_viewed_at",
      DROP COLUMN IF EXISTS "first_viewed_at",
      DROP COLUMN IF EXISTS "subscription_prepared",
      DROP COLUMN IF EXISTS "payment_date",
      DROP COLUMN IF EXISTS "remaining_balance",
      DROP COLUMN IF EXISTS "paid_amount",
      DROP COLUMN IF EXISTS "checkout_session_id",
      DROP COLUMN IF EXISTS "payment_intent_id",
      DROP COLUMN IF EXISTS "payment_status",
      DROP COLUMN IF EXISTS "sent_at",
      DROP COLUMN IF EXISTS "public_token_expires_at",
      DROP COLUMN IF EXISTS "public_token",
      DROP COLUMN IF EXISTS "deposit_required",
      DROP COLUMN IF EXISTS "deposit_fixed_amount",
      DROP COLUMN IF EXISTS "deposit_percent",
      DROP COLUMN IF EXISTS "deposit_type",
      DROP COLUMN IF EXISTS "agreement_version",
      DROP COLUMN IF EXISTS "agreement_text",
      DROP COLUMN IF EXISTS "faqs",
      DROP COLUMN IF EXISTS "revoked",
      DROP COLUMN IF EXISTS "approval_status";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_proposal_view_events_event_type";
    DROP TYPE IF EXISTS "public"."enum_proposals_payment_status";
    DROP TYPE IF EXISTS "public"."enum_proposals_deposit_type";
    DROP TYPE IF EXISTS "public"."enum_proposals_approval_status";
  `);
}
