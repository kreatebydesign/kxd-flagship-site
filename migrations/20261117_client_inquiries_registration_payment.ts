/**
 * Primal registration payment receipt — additive client_inquiries columns.
 * Local registration only until production migration is authorized.
 */
import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_inquiries_payment_status'
      ) THEN
        CREATE TYPE "public"."enum_client_inquiries_payment_status" AS ENUM(
          'pending',
          'paid',
          'failed',
          'refunded',
          'payment_exception'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_inquiries"
      ADD COLUMN IF NOT EXISTS "registration_id" varchar,
      ADD COLUMN IF NOT EXISTS "program_label" varchar,
      ADD COLUMN IF NOT EXISTS "course_id" varchar,
      ADD COLUMN IF NOT EXISTS "payment_status" "public"."enum_client_inquiries_payment_status",
      ADD COLUMN IF NOT EXISTS "payment_amount_cents" integer,
      ADD COLUMN IF NOT EXISTS "payment_currency" varchar DEFAULT 'usd',
      ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" varchar,
      ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" varchar,
      ADD COLUMN IF NOT EXISTS "paid_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "event_starts_on" date,
      ADD COLUMN IF NOT EXISTS "event_ends_on" date;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_registration_id_idx"
      ON "client_inquiries" ("registration_id");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inquiries_payment_status_idx"
      ON "client_inquiries" ("payment_status");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "client_inquiries_payment_status_idx";`);
  await db.execute(sql`DROP INDEX IF EXISTS "client_inquiries_registration_id_idx";`);

  await db.execute(sql`
    ALTER TABLE "client_inquiries"
      DROP COLUMN IF EXISTS "event_ends_on",
      DROP COLUMN IF EXISTS "event_starts_on",
      DROP COLUMN IF EXISTS "refunded_at",
      DROP COLUMN IF EXISTS "paid_at",
      DROP COLUMN IF EXISTS "stripe_payment_intent_id",
      DROP COLUMN IF EXISTS "stripe_checkout_session_id",
      DROP COLUMN IF EXISTS "payment_currency",
      DROP COLUMN IF EXISTS "payment_amount_cents",
      DROP COLUMN IF EXISTS "payment_status",
      DROP COLUMN IF EXISTS "course_id",
      DROP COLUMN IF EXISTS "program_label",
      DROP COLUMN IF EXISTS "registration_id";
  `);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_inquiries_payment_status";`);
}