/**
 * Owner-approved historical pay durations (pre–Time Clock).
 * Duration records only — not a substitute for verified punch times.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_pay_historical_entries" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "local_date_key" varchar NOT NULL,
      "payable_minutes" integer NOT NULL,
      "hourly_rate_cents" integer NOT NULL,
      "pay_period_id" integer,
      "source_kind" varchar NOT NULL DEFAULT 'reported_pre_time_clock',
      "provenance_note" varchar NOT NULL,
      "owner_approved_by_user_id" integer NOT NULL,
      "owner_approved_at" timestamp(3) with time zone NOT NULL,
      "status" varchar NOT NULL DEFAULT 'owner_approved',
      "audit_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_pay_historical_entries"
        ADD CONSTRAINT "staff_pay_historical_entries_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_pay_historical_entries"
        ADD CONSTRAINT "staff_pay_historical_entries_pay_period_id_staff_pay_periods_id_fk"
        FOREIGN KEY ("pay_period_id") REFERENCES "public"."staff_pay_periods"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_pay_historical_entries_staff_date_active"
      ON "staff_pay_historical_entries" ("staff_user_id", "local_date_key")
      WHERE "status" <> 'voided';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_pay_historical_entries" CASCADE;`);
}
