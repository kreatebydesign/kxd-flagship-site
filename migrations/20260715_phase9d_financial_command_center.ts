/**
 * KXD OS Phase 9D — Financial Command Center + Revenue Intelligence
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_payment_preference') THEN
        CREATE TYPE "public"."enum_billing_profiles_payment_preference"
          AS ENUM('invoice', 'ach', 'card', 'wire', 'other');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_invoice_cadence') THEN
        CREATE TYPE "public"."enum_billing_profiles_invoice_cadence"
          AS ENUM('monthly', 'quarterly', 'milestone', 'on-completion');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_payment_terms') THEN
        CREATE TYPE "public"."enum_billing_profiles_payment_terms"
          AS ENUM('due-on-receipt', 'net-15', 'net-30', 'net-45');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_billing_status') THEN
        CREATE TYPE "public"."enum_billing_profiles_billing_status"
          AS ENUM('not-configured', 'partial', 'active', 'paused', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_revenue_events_event_type') THEN
        CREATE TYPE "public"."enum_revenue_events_event_type"
          AS ENUM(
            'revenue.proposal-approved', 'revenue.proposal-converted', 'revenue.contract-signed',
            'revenue.retainer-started', 'revenue.retainer-renewed', 'revenue.retainer-ended',
            'revenue.project-launched', 'revenue.project-completed', 'billing.setup-missing',
            'revenue.at-risk', 'revenue.recovered'
          );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_financial_snapshots_snapshot_type') THEN
        CREATE TYPE "public"."enum_financial_snapshots_snapshot_type"
          AS ENUM('executive', 'client', 'mrr', 'pipeline', 'contracted', 'renewal', 'at-risk');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_financial_health_risk_level') THEN
        CREATE TYPE "public"."enum_client_financial_health_risk_level"
          AS ENUM('low', 'medium', 'high', 'critical');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_financial_health_renewal_status') THEN
        CREATE TYPE "public"."enum_client_financial_health_renewal_status"
          AS ENUM('n/a', 'current', 'approaching', 'overdue', 'ended');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "billing_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE CASCADE,
      "billing_status" "public"."enum_billing_profiles_billing_status" DEFAULT 'not-configured' NOT NULL,
      "billing_contact" varchar,
      "billing_email" varchar,
      "payment_preference" "public"."enum_billing_profiles_payment_preference" DEFAULT 'invoice',
      "invoice_cadence" "public"."enum_billing_profiles_invoice_cadence" DEFAULT 'monthly',
      "payment_terms" "public"."enum_billing_profiles_payment_terms" DEFAULT 'net-30',
      "missing_setup_flags" jsonb,
      "stripe_customer_id" varchar,
      "stripe_subscription_id" varchar,
      "quickbooks_customer_id" varchar,
      "wave_customer_id" varchar,
      "executive_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "revenue_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "proposal_id" integer REFERENCES "proposals"("id") ON DELETE SET NULL,
      "contract_id" integer REFERENCES "contracts"("id") ON DELETE SET NULL,
      "retainer_id" integer REFERENCES "retainers"("id") ON DELETE SET NULL,
      "project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "event_type" "public"."enum_revenue_events_event_type" NOT NULL,
      "title" varchar NOT NULL,
      "summary" varchar,
      "amount" numeric,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "dedupe_key" varchar UNIQUE,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "financial_snapshots" (
      "id" serial PRIMARY KEY NOT NULL,
      "snapshot_type" "public"."enum_financial_snapshots_snapshot_type" NOT NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "period_label" varchar NOT NULL,
      "generated_at" timestamp(3) with time zone NOT NULL,
      "metrics" jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_financial_health" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE CASCADE,
      "health_score" numeric DEFAULT 50,
      "risk_level" "public"."enum_client_financial_health_risk_level" DEFAULT 'low',
      "mrr" numeric,
      "lifetime_value" numeric,
      "contracted_value" numeric,
      "pipeline_value" numeric,
      "project_value" numeric,
      "at_risk_amount" numeric,
      "billing_setup_complete" boolean DEFAULT false,
      "renewal_status" "public"."enum_client_financial_health_renewal_status" DEFAULT 'n/a',
      "flags" jsonb,
      "recommendations" jsonb,
      "last_calculated_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "billing_profiles_client_idx" ON "billing_profiles" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "billing_profiles_billing_status_idx" ON "billing_profiles" USING btree ("billing_status");
    CREATE INDEX IF NOT EXISTS "revenue_events_client_idx" ON "revenue_events" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "revenue_events_event_type_idx" ON "revenue_events" USING btree ("event_type");
    CREATE INDEX IF NOT EXISTS "revenue_events_occurred_at_idx" ON "revenue_events" USING btree ("occurred_at");
    CREATE INDEX IF NOT EXISTS "financial_snapshots_snapshot_type_idx" ON "financial_snapshots" USING btree ("snapshot_type");
    CREATE INDEX IF NOT EXISTS "financial_snapshots_client_idx" ON "financial_snapshots" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "financial_snapshots_period_label_idx" ON "financial_snapshots" USING btree ("period_label");
    CREATE INDEX IF NOT EXISTS "client_financial_health_client_idx" ON "client_financial_health" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_financial_health_risk_level_idx" ON "client_financial_health" USING btree ("risk_level");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "client_financial_health" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "financial_snapshots" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "revenue_events" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "billing_profiles" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_financial_health_renewal_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_financial_health_risk_level";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_financial_snapshots_snapshot_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_revenue_events_event_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_billing_profiles_billing_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_billing_profiles_payment_terms";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_billing_profiles_invoice_cadence";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_billing_profiles_payment_preference";`);
}
