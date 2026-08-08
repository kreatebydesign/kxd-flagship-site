/**
 * Additive: CSI v1-b human-confirmed sale + commission lifecycle.
 *
 * The immutable ingest payload remains unchanged. These first-class columns are
 * operator authority and cannot be written by the website receiver.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_site_events_lifecycle_status'
      ) THEN
        CREATE TYPE "public"."enum_client_site_events_lifecycle_status" AS ENUM(
          'new', 'acknowledged', 'sold_confirmed', 'closed_no_sale'
        );
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_site_events_commission_status'
      ) THEN
        CREATE TYPE "public"."enum_client_site_events_commission_status" AS ENUM(
          'not_due', 'due', 'paid'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_site_events"
      ADD COLUMN IF NOT EXISTS "lifecycle_status"
        "public"."enum_client_site_events_lifecycle_status" NOT NULL DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS "commission_status"
        "public"."enum_client_site_events_commission_status" NOT NULL DEFAULT 'not_due',
      ADD COLUMN IF NOT EXISTS "commission_amount_cents" integer,
      ADD COLUMN IF NOT EXISTS "sold_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "sale_reference" varchar,
      ADD COLUMN IF NOT EXISTS "cart_model_reference" varchar,
      ADD COLUMN IF NOT EXISTS "confirmed_by_id" integer,
      ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "commission_paid_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "commission_payment_reference" varchar,
      ADD COLUMN IF NOT EXISTS "commission_paid_by_id" integer;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_lifecycle_status_idx"
      ON "client_site_events" ("lifecycle_status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_commission_status_idx"
      ON "client_site_events" ("commission_status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_confirmed_by_id_idx"
      ON "client_site_events" ("confirmed_by_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_commission_paid_by_id_idx"
      ON "client_site_events" ("commission_paid_by_id");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_site_events_confirmed_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "client_site_events"
          ADD CONSTRAINT "client_site_events_confirmed_by_id_users_id_fk"
          FOREIGN KEY ("confirmed_by_id") REFERENCES "public"."users"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_site_events_commission_paid_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "client_site_events"
          ADD CONSTRAINT "client_site_events_commission_paid_by_id_users_id_fk"
          FOREIGN KEY ("commission_paid_by_id") REFERENCES "public"."users"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_site_events_sale_commission_integrity_check'
      ) THEN
        ALTER TABLE "client_site_events"
          ADD CONSTRAINT "client_site_events_sale_commission_integrity_check"
          CHECK (
            (
              "lifecycle_status" IN ('new', 'acknowledged', 'closed_no_sale')
              AND "commission_status" = 'not_due'
              AND "commission_amount_cents" IS NULL
              AND "sold_at" IS NULL
              AND "sale_reference" IS NULL
              AND "confirmed_by_id" IS NULL
              AND "confirmed_at" IS NULL
              AND "commission_paid_at" IS NULL
              AND "commission_payment_reference" IS NULL
              AND "commission_paid_by_id" IS NULL
            )
            OR (
              "lifecycle_status" = 'sold_confirmed'
              AND "commission_status" = 'due'
              AND "commission_amount_cents" = 30000
              AND "sold_at" IS NOT NULL
              AND NULLIF(BTRIM("sale_reference"), '') IS NOT NULL
              AND "confirmed_by_id" IS NOT NULL
              AND "confirmed_at" IS NOT NULL
              AND "commission_paid_at" IS NULL
              AND "commission_payment_reference" IS NULL
              AND "commission_paid_by_id" IS NULL
            )
            OR (
              "lifecycle_status" = 'sold_confirmed'
              AND "commission_status" = 'paid'
              AND "commission_amount_cents" = 30000
              AND "sold_at" IS NOT NULL
              AND NULLIF(BTRIM("sale_reference"), '') IS NOT NULL
              AND "confirmed_by_id" IS NOT NULL
              AND "confirmed_at" IS NOT NULL
              AND "commission_paid_at" IS NOT NULL
              AND NULLIF(BTRIM("commission_payment_reference"), '') IS NOT NULL
              AND "commission_paid_by_id" IS NOT NULL
            )
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "executive_timeline_events_csi_lifecycle_dedupe_uidx"
      ON "executive_timeline_events" (
        "client_id",
        "event_type",
        ("metadata"->>'dedupeKey')
      )
      WHERE "event_type" IN (
        'client-site.sale.confirmed',
        'client-site.commission.due',
        'client-site.commission.paid'
      )
      AND "metadata"->>'dedupeKey' IS NOT NULL;
  `);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  void _args;
  // Intentional no-op: lifecycle and payment audit evidence is append-only.
  // Reapplying `up` is idempotent; rollback never removes columns, constraints,
  // relationships, indexes, or recorded operator evidence.
}
