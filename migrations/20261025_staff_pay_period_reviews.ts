/**
 * V1-STAFF-004 — Pay period review workflow state (not payroll execution).
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_pay_period_reviews" (
      "id" serial PRIMARY KEY NOT NULL,
      "pay_period_id" integer NOT NULL,
      "workflow_state" varchar NOT NULL DEFAULT 'recorded',
      "reviewed_at" timestamp(3) with time zone,
      "reviewed_by_user_id" integer,
      "review_note" varchar,
      "audit_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "data_fingerprint" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_pay_period_reviews"
        ADD CONSTRAINT "staff_pay_period_reviews_pay_period_id_staff_pay_periods_id_fk"
        FOREIGN KEY ("pay_period_id") REFERENCES "public"."staff_pay_periods"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_pay_period_reviews_period_uidx"
      ON "staff_pay_period_reviews" ("pay_period_id");
  `);

  await db.execute(sql`
    ALTER TABLE "staff_pay_period_reviews"
      ADD COLUMN IF NOT EXISTS "data_fingerprint" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_pay_period_reviews" CASCADE;`);
}
