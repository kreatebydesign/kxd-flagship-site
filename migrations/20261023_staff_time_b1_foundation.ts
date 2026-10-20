/**
 * KXD OS V1.4 B1 — Staff time punch ledger, shifts, payroll schedule foundation.
 * Additive only. Does not import historical hours.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_time_shifts" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "status" varchar NOT NULL DEFAULT 'active',
      "started_at" timestamp(3) with time zone NOT NULL,
      "ended_at" timestamp(3) with time zone,
      "work_timezone" varchar NOT NULL,
      "local_date_key" varchar NOT NULL,
      "work_intent_category" varchar NOT NULL,
      "work_intent_work_id" integer,
      "work_intent_client_id" integer,
      "work_intent_note" varchar,
      "pay_period_id" integer,
      "audit_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_time_punch_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "shift_id" integer NOT NULL,
      "staff_user_id" integer NOT NULL,
      "event_type" varchar NOT NULL,
      "recorded_at" timestamp(3) with time zone NOT NULL,
      "actor_user_id" integer NOT NULL,
      "idempotency_key" varchar,
      "payload" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_payroll_config" (
      "id" integer PRIMARY KEY NOT NULL DEFAULT 1,
      "frequency" varchar NOT NULL DEFAULT 'biweekly',
      "weekly_hours_limit" numeric NOT NULL DEFAULT 40,
      "workweek_starts_on" varchar NOT NULL DEFAULT 'monday',
      "pay_period_ends_on" varchar NOT NULL DEFAULT 'sunday',
      "timezone" varchar NOT NULL DEFAULT 'America/Los_Angeles',
      "first_payday" date NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "staff_payroll_config_singleton" CHECK ("id" = 1)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_pay_periods" (
      "id" serial PRIMARY KEY NOT NULL,
      "period_start" date NOT NULL,
      "period_end" date NOT NULL,
      "payday" date NOT NULL,
      "period_kind" varchar NOT NULL DEFAULT 'regular',
      "label" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_employment_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "employment_start" date NOT NULL,
      "work_jurisdiction" varchar NOT NULL DEFAULT 'oregon',
      "weekly_hours_limit" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_hourly_rates" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "rate_cents" numeric NOT NULL,
      "effective_from" date NOT NULL,
      "effective_to" date,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_shifts"
        ADD CONSTRAINT "staff_time_shifts_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_punch_events"
        ADD CONSTRAINT "staff_time_punch_events_shift_id_staff_time_shifts_id_fk"
        FOREIGN KEY ("shift_id") REFERENCES "public"."staff_time_shifts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_punch_events"
        ADD CONSTRAINT "staff_time_punch_events_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_punch_events"
        ADD CONSTRAINT "staff_time_punch_events_actor_user_id_users_id_fk"
        FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id")
        ON DELETE no action ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_time_shifts"
        ADD CONSTRAINT "staff_time_shifts_pay_period_id_staff_pay_periods_id_fk"
        FOREIGN KEY ("pay_period_id") REFERENCES "public"."staff_pay_periods"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_employment_profiles"
        ADD CONSTRAINT "staff_employment_profiles_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_hourly_rates"
        ADD CONSTRAINT "staff_hourly_rates_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_time_shifts_one_active_per_user"
      ON "staff_time_shifts" ("staff_user_id")
      WHERE "status" = 'active';
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_time_punch_idempotency_uidx"
      ON "staff_time_punch_events" ("staff_user_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_pay_periods_range_uidx"
      ON "staff_pay_periods" ("period_start", "period_end");
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_employment_profiles_staff_user_uidx"
      ON "staff_employment_profiles" ("staff_user_id");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_time_shifts_staff_user_started_idx"
      ON "staff_time_shifts" ("staff_user_id", "started_at" DESC);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_time_punch_events_shift_idx"
      ON "staff_time_punch_events" ("shift_id", "recorded_at");
  `);

  await db.execute(sql`
    INSERT INTO "staff_payroll_config" (
      "id",
      "frequency",
      "weekly_hours_limit",
      "workweek_starts_on",
      "pay_period_ends_on",
      "timezone",
      "first_payday"
    ) VALUES (
      1,
      'biweekly',
      40,
      'monday',
      'sunday',
      'America/Los_Angeles',
      '2026-10-30'
    )
    ON CONFLICT ("id") DO NOTHING;
  `);

  await db.execute(sql`
    INSERT INTO "staff_pay_periods" (
      "period_start",
      "period_end",
      "payday",
      "period_kind",
      "label"
    ) VALUES
      (
        '2026-10-15',
        '2026-10-25',
        '2026-10-30',
        'initial_short',
        'Oct 15–25, 2026 (initial shortened period)'
      ),
      (
        '2026-10-26',
        '2026-11-08',
        '2026-11-13',
        'regular',
        'Oct 26 – Nov 8, 2026'
      ),
      (
        '2026-11-09',
        '2026-11-22',
        '2026-11-27',
        'regular',
        'Nov 9 – Nov 22, 2026'
      )
    ON CONFLICT ("period_start", "period_end") DO NOTHING;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_time_punch_events" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_time_shifts" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_hourly_rates" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_employment_profiles" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_pay_periods" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_payroll_config" CASCADE;`);
}
