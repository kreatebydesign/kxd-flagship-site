/**
 * KXD Core Phase 5B — Infrastructure Manager
 * client_infrastructure, infrastructure_events, infrastructure_costs
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── Enums: client_infrastructure ────────────────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_status"
          AS ENUM('healthy', 'attention', 'critical', 'unknown');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_ssl_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_ssl_status"
          AS ENUM('unknown', 'valid', 'expiring', 'expired', 'missing');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_deployment_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_deployment_status"
          AS ENUM('unknown', 'live', 'building', 'failed', 'idle');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_search_console_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_search_console_status"
          AS ENUM('unknown', 'connected', 'not-connected', 'pending');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_spf_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_spf_status"
          AS ENUM('unknown', 'valid', 'missing', 'misconfigured');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_dkim_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_dkim_status"
          AS ENUM('unknown', 'valid', 'missing', 'misconfigured');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_dmarc_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_dmarc_status"
          AS ENUM('unknown', 'valid', 'missing', 'misconfigured');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_stripe_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_stripe_status"
          AS ENUM('unknown', 'active', 'inactive', 'not-configured');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_infrastructure_resend_status') THEN
        CREATE TYPE "public"."enum_client_infrastructure_resend_status"
          AS ENUM('unknown', 'active', 'inactive', 'not-configured');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_infrastructure" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE CASCADE,
      "status" "public"."enum_client_infrastructure_status" DEFAULT 'unknown' NOT NULL,
      "infrastructure_score" numeric,
      "primary_domain" varchar,
      "domain_registrar" varchar,
      "domain_expiration_date" timestamp(3) with time zone,
      "domain_auto_renew" boolean DEFAULT false,
      "dns_provider" varchar,
      "nameservers" varchar,
      "ssl_status" "public"."enum_client_infrastructure_ssl_status" DEFAULT 'unknown',
      "ssl_expiration_date" timestamp(3) with time zone,
      "hosting_provider" varchar,
      "production_url" varchar,
      "staging_url" varchar,
      "github_repo" varchar,
      "vercel_project" varchar,
      "vercel_team" varchar,
      "last_deployment_date" timestamp(3) with time zone,
      "deployment_status" "public"."enum_client_infrastructure_deployment_status" DEFAULT 'unknown',
      "analytics_provider" varchar,
      "ga4_property_id" varchar,
      "search_console_status" "public"."enum_client_infrastructure_search_console_status" DEFAULT 'unknown',
      "email_provider" varchar,
      "workspace_provider" varchar,
      "email_domain" varchar,
      "spf_status" "public"."enum_client_infrastructure_spf_status" DEFAULT 'unknown',
      "dkim_status" "public"."enum_client_infrastructure_dkim_status" DEFAULT 'unknown',
      "dmarc_status" "public"."enum_client_infrastructure_dmarc_status" DEFAULT 'unknown',
      "stripe_status" "public"."enum_client_infrastructure_stripe_status" DEFAULT 'unknown',
      "resend_status" "public"."enum_client_infrastructure_resend_status" DEFAULT 'unknown',
      "monthly_stack_cost" numeric,
      "annual_renewal_cost" numeric,
      "renewal_notes" varchar,
      "internal_notes" varchar,
      "next_renewal_date" timestamp(3) with time zone,
      "last_reviewed_at" timestamp(3) with time zone,
      "reviewed_by" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  // ── Enums: infrastructure_events ───────────────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_infrastructure_events_event_type') THEN
        CREATE TYPE "public"."enum_infrastructure_events_event_type"
          AS ENUM(
            'domain', 'dns', 'ssl', 'hosting', 'deployment', 'analytics',
            'search-console', 'email', 'payments', 'cost', 'renewal',
            'issue', 'recommendation', 'general'
          );
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_infrastructure_events_severity') THEN
        CREATE TYPE "public"."enum_infrastructure_events_severity"
          AS ENUM('info', 'success', 'warning', 'critical');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_infrastructure_events_status') THEN
        CREATE TYPE "public"."enum_infrastructure_events_status"
          AS ENUM('open', 'resolved', 'ignored');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_infrastructure_events_source') THEN
        CREATE TYPE "public"."enum_infrastructure_events_source"
          AS ENUM('manual', 'system', 'ai');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "infrastructure_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "infrastructure_id" integer REFERENCES "client_infrastructure"("id") ON DELETE SET NULL,
      "event_type" "public"."enum_infrastructure_events_event_type" DEFAULT 'general' NOT NULL,
      "title" varchar NOT NULL,
      "description" varchar,
      "severity" "public"."enum_infrastructure_events_severity" DEFAULT 'info' NOT NULL,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "resolved_at" timestamp(3) with time zone,
      "status" "public"."enum_infrastructure_events_status" DEFAULT 'open' NOT NULL,
      "source" "public"."enum_infrastructure_events_source" DEFAULT 'manual',
      "internal_only" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  // ── Enums: infrastructure_costs ───────────────────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_infrastructure_costs_category') THEN
        CREATE TYPE "public"."enum_infrastructure_costs_category"
          AS ENUM(
            'domain', 'hosting', 'email', 'analytics', 'storage', 'software',
            'payments', 'automation', 'ai', 'design', 'other'
          );
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_infrastructure_costs_billing_cycle') THEN
        CREATE TYPE "public"."enum_infrastructure_costs_billing_cycle"
          AS ENUM('monthly', 'annual', 'one-time');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_infrastructure_costs_paid_by') THEN
        CREATE TYPE "public"."enum_infrastructure_costs_paid_by"
          AS ENUM('kxd', 'client', 'unknown');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "infrastructure_costs" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "infrastructure_id" integer REFERENCES "client_infrastructure"("id") ON DELETE SET NULL,
      "name" varchar NOT NULL,
      "category" "public"."enum_infrastructure_costs_category" DEFAULT 'other' NOT NULL,
      "vendor" varchar,
      "amount" numeric NOT NULL,
      "billing_cycle" "public"."enum_infrastructure_costs_billing_cycle" DEFAULT 'monthly' NOT NULL,
      "paid_by" "public"."enum_infrastructure_costs_paid_by" DEFAULT 'unknown',
      "renewal_date" timestamp(3) with time zone,
      "account_owner" varchar,
      "notes" varchar,
      "active" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  // ── Indexes ─────────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_infrastructure_client_idx"
      ON "client_infrastructure" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_infrastructure_status_idx"
      ON "client_infrastructure" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_infrastructure_next_renewal_idx"
      ON "client_infrastructure" USING btree ("next_renewal_date");
    CREATE INDEX IF NOT EXISTS "infrastructure_events_client_idx"
      ON "infrastructure_events" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "infrastructure_events_occurred_at_idx"
      ON "infrastructure_events" USING btree ("occurred_at" DESC);
    CREATE INDEX IF NOT EXISTS "infrastructure_events_status_idx"
      ON "infrastructure_events" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "infrastructure_costs_client_idx"
      ON "infrastructure_costs" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "infrastructure_costs_active_idx"
      ON "infrastructure_costs" USING btree ("active");
  `);

  // ── Locked documents rels ───────────────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "client_infrastructure_id" integer,
      ADD COLUMN IF NOT EXISTS "infrastructure_events_id" integer,
      ADD COLUMN IF NOT EXISTS "infrastructure_costs_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "infrastructure_costs_id",
      DROP COLUMN IF EXISTS "infrastructure_events_id",
      DROP COLUMN IF EXISTS "client_infrastructure_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "infrastructure_costs" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "infrastructure_events" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_infrastructure" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_infrastructure_costs_paid_by";
    DROP TYPE IF EXISTS "public"."enum_infrastructure_costs_billing_cycle";
    DROP TYPE IF EXISTS "public"."enum_infrastructure_costs_category";
    DROP TYPE IF EXISTS "public"."enum_infrastructure_events_source";
    DROP TYPE IF EXISTS "public"."enum_infrastructure_events_status";
    DROP TYPE IF EXISTS "public"."enum_infrastructure_events_severity";
    DROP TYPE IF EXISTS "public"."enum_infrastructure_events_event_type";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_resend_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_stripe_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_dmarc_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_dkim_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_spf_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_search_console_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_deployment_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_ssl_status";
    DROP TYPE IF EXISTS "public"."enum_client_infrastructure_status";
  `);
}
