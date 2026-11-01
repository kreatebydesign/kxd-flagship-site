/**
 * Employee time/pay acknowledgments and correction requests (not payroll execution).
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_time_pay_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "request_kind" varchar NOT NULL,
      "shift_id" integer,
      "local_date_key" varchar NOT NULL,
      "pay_period_id" integer,
      "proposed_start_at" timestamp(3) with time zone,
      "proposed_end_at" timestamp(3) with time zone,
      "employee_note" varchar NOT NULL,
      "status" varchar NOT NULL DEFAULT 'submitted',
      "owner_note" varchar,
      "resolution_kind" varchar,
      "audit_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "resolved_at" timestamp(3) with time zone,
      "resolved_by_user_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_pay_requests"
        ADD CONSTRAINT "staff_time_pay_requests_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_pay_requests"
        ADD CONSTRAINT "staff_time_pay_requests_shift_id_staff_time_shifts_id_fk"
        FOREIGN KEY ("shift_id") REFERENCES "public"."staff_time_shifts"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_pay_requests"
        ADD CONSTRAINT "staff_time_pay_requests_pay_period_id_staff_pay_periods_id_fk"
        FOREIGN KEY ("pay_period_id") REFERENCES "public"."staff_pay_periods"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_time_pay_requests_staff_user_idx"
      ON "staff_time_pay_requests" ("staff_user_id", "created_at" DESC);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_time_pay_requests_status_idx"
      ON "staff_time_pay_requests" ("status", "created_at" DESC);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_time_pay_requests" CASCADE;`);
}
