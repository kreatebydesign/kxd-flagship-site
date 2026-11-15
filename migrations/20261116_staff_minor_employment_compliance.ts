/**
 * Minor/family staff employment compliance + bonus payment tracking.
 * Additive only. Local apply until production migration is authorized.
 *
 * Does not assume FICA/FUTA exemptions or S-corp election. Owner confirms applicability.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_employment_compliance_records" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "employment_authorization_status" varchar NOT NULL DEFAULT 'pending',
      "oregon_permit_confirmed" boolean NOT NULL DEFAULT false,
      "permit_effective_date" date,
      "permit_expiration_date" date,
      "approved_work_categories" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "school_day_max_minutes" integer,
      "non_school_day_max_minutes" integer,
      "weekly_max_minutes" integer,
      "school_day_earliest_start_local" varchar,
      "school_day_latest_end_local" varchar,
      "non_school_day_earliest_start_local" varchar,
      "non_school_day_latest_end_local" varchar,
      "scheduling_rules" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "paid_shift_activation" varchar NOT NULL DEFAULT 'blocked',
      "payroll_setup_confirmed" boolean NOT NULL DEFAULT false,
      "owner_hourly_rate_confirmed" boolean NOT NULL DEFAULT false,
      "owner_compliance_note" varchar,
      "audit_events" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "last_updated_by_user_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "staff_employment_compliance_staff_user_id_unique" UNIQUE ("staff_user_id"),
      CONSTRAINT "staff_employment_compliance_paid_shift_activation_check"
        CHECK ("paid_shift_activation" IN ('blocked', 'allowed'))
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_employment_compliance_staff_user_id_fk'
      ) THEN
        ALTER TABLE "staff_employment_compliance_records"
          ADD CONSTRAINT "staff_employment_compliance_staff_user_id_fk"
          FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_employment_compliance_last_updated_by_fk'
      ) THEN
        ALTER TABLE "staff_employment_compliance_records"
          ADD CONSTRAINT "staff_employment_compliance_last_updated_by_fk"
          FOREIGN KEY ("last_updated_by_user_id") REFERENCES "public"."users"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses"
      ADD COLUMN IF NOT EXISTS "payment_status" varchar NOT NULL DEFAULT 'pending';
  `);

  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses"
      ADD COLUMN IF NOT EXISTS "payment_recorded_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses"
      ADD COLUMN IF NOT EXISTS "payment_reference" varchar;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses"
      ADD COLUMN IF NOT EXISTS "payment_idempotency_key" varchar;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_discretionary_bonuses_payment_idempotency_idx"
      ON "staff_discretionary_bonuses" ("staff_user_id", "payment_idempotency_key")
      WHERE "payment_idempotency_key" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "staff_discretionary_bonuses_payment_idempotency_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses" DROP COLUMN IF EXISTS "payment_idempotency_key";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses" DROP COLUMN IF EXISTS "payment_reference";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses" DROP COLUMN IF EXISTS "payment_recorded_at";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_discretionary_bonuses" DROP COLUMN IF EXISTS "payment_status";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_employment_compliance_records" CASCADE;`);
}