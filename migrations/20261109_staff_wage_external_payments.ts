/**
 * External wage payment ledger — records off-platform settlements with entry-level allocations.
 * Not payroll execution, tax, or banking integration.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_wage_payments" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "total_cents" integer NOT NULL,
      "payment_method" varchar NOT NULL,
      "official_payroll_date" date NOT NULL,
      "settled_at" timestamp(3) with time zone NOT NULL,
      "external_reference" varchar NOT NULL,
      "status" varchar NOT NULL DEFAULT 'recorded',
      "owner_note" varchar,
      "recorded_by_user_id" integer NOT NULL,
      "audit_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "staff_wage_payments_total_positive" CHECK ("total_cents" > 0)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_wage_payment_allocations" (
      "id" serial PRIMARY KEY NOT NULL,
      "wage_payment_id" integer NOT NULL,
      "staff_user_id" integer NOT NULL,
      "source_kind" varchar NOT NULL,
      "shift_id" integer,
      "historical_entry_id" integer,
      "pay_period_id" integer,
      "local_date_key" varchar NOT NULL,
      "payable_minutes" integer NOT NULL,
      "hourly_rate_cents" integer NOT NULL,
      "gross_cents" integer NOT NULL,
      "status" varchar NOT NULL DEFAULT 'active',
      "audit_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "staff_wage_payment_allocations_source_check"
        CHECK (
          ("source_kind" = 'time_shift' AND "shift_id" IS NOT NULL AND "historical_entry_id" IS NULL)
          OR ("source_kind" = 'historical_entry' AND "historical_entry_id" IS NOT NULL AND "shift_id" IS NULL)
        ),
      CONSTRAINT "staff_wage_payment_allocations_gross_positive" CHECK ("gross_cents" > 0),
      CONSTRAINT "staff_wage_payment_allocations_minutes_positive" CHECK ("payable_minutes" > 0)
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_wage_payments"
        ADD CONSTRAINT "staff_wage_payments_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_wage_payments"
        ADD CONSTRAINT "staff_wage_payments_recorded_by_user_id_users_id_fk"
        FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id")
        ON DELETE no action ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_wage_payment_allocations"
        ADD CONSTRAINT "staff_wage_payment_allocations_wage_payment_id_fk"
        FOREIGN KEY ("wage_payment_id") REFERENCES "public"."staff_wage_payments"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_wage_payment_allocations"
        ADD CONSTRAINT "staff_wage_payment_allocations_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_wage_payment_allocations"
        ADD CONSTRAINT "staff_wage_payment_allocations_shift_id_fk"
        FOREIGN KEY ("shift_id") REFERENCES "public"."staff_time_shifts"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_wage_payment_allocations"
        ADD CONSTRAINT "staff_wage_payment_allocations_historical_entry_id_fk"
        FOREIGN KEY ("historical_entry_id") REFERENCES "public"."staff_pay_historical_entries"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_wage_payment_allocations"
        ADD CONSTRAINT "staff_wage_payment_allocations_pay_period_id_fk"
        FOREIGN KEY ("pay_period_id") REFERENCES "public"."staff_pay_periods"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_wage_payments_external_ref_active"
      ON "staff_wage_payments" ("staff_user_id", "external_reference")
      WHERE "status" <> 'voided';
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_wage_payment_alloc_shift_active"
      ON "staff_wage_payment_allocations" ("shift_id")
      WHERE "status" = 'active' AND "shift_id" IS NOT NULL;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_wage_payment_alloc_hist_active"
      ON "staff_wage_payment_allocations" ("historical_entry_id")
      WHERE "status" = 'active' AND "historical_entry_id" IS NOT NULL;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_wage_payments_staff_created_idx"
      ON "staff_wage_payments" ("staff_user_id", "created_at" DESC);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_wage_payment_alloc_staff_idx"
      ON "staff_wage_payment_allocations" ("staff_user_id", "local_date_key");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_wage_payment_allocations" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_wage_payments" CASCADE;`);
}
