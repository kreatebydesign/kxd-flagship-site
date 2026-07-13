/**
 * Phase 31C — Reporting Facts table (Shared Core persistence).
 * Additive only. No credentials. No provider payloads.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_reporting_facts_period_grain') THEN
        CREATE TYPE "public"."enum_reporting_facts_period_grain"
          AS ENUM('day', 'week', 'month');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_reporting_facts_trend') THEN
        CREATE TYPE "public"."enum_reporting_facts_trend"
          AS ENUM('up', 'down', 'flat', 'unknown');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_reporting_facts_source_freshness') THEN
        CREATE TYPE "public"."enum_reporting_facts_source_freshness"
          AS ENUM('fresh', 'stale', 'missing');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_reporting_facts_source_confidence') THEN
        CREATE TYPE "public"."enum_reporting_facts_source_confidence"
          AS ENUM('high', 'medium', 'low', 'unknown');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "reporting_facts" (
      "id" serial PRIMARY KEY NOT NULL,
      "fact_key" varchar NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "period_start" varchar NOT NULL,
      "period_end" varchar NOT NULL,
      "period_grain" "public"."enum_reporting_facts_period_grain" DEFAULT 'month' NOT NULL,
      "period_label" varchar,
      "domain" varchar NOT NULL,
      "metric_key" varchar NOT NULL,
      "provider_id" varchar NOT NULL,
      "value" numeric NOT NULL,
      "unit" varchar NOT NULL,
      "previous_value" numeric,
      "delta" numeric,
      "trend" "public"."enum_reporting_facts_trend",
      "source_fetched_at" varchar NOT NULL,
      "source_freshness" "public"."enum_reporting_facts_source_freshness" NOT NULL,
      "source_confidence" "public"."enum_reporting_facts_source_confidence" NOT NULL,
      "evidence_refs" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "reporting_facts_fact_key_idx"
      ON "reporting_facts" ("fact_key");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_facts_client_idx"
      ON "reporting_facts" ("client_id");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_facts_client_period_idx"
      ON "reporting_facts" ("client_id", "period_start");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_facts_domain_idx"
      ON "reporting_facts" ("domain");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_facts_metric_key_idx"
      ON "reporting_facts" ("metric_key");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "reporting_facts_provider_id_idx"
      ON "reporting_facts" ("provider_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "reporting_facts";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_reporting_facts_period_grain";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_reporting_facts_trend";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_reporting_facts_source_freshness";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_reporting_facts_source_confidence";`);
}
