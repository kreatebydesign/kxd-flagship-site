/**
 * KXD OS Phase 2A — Client operating system data foundation.
 * Creates: clients, retainers, client_projects, monthly_deliverables, client_requests.
 * All statements are idempotent (IF NOT EXISTS / DO $$ guards).
 * Safe to run against production. Does NOT alter or drop any existing tables.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. Enum types ────────────────────────────────────────────────────────────

  await db.execute(sql`
    DO $$
    BEGIN

      -- clients: status
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_clients_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_clients_status"
          AS ENUM('active', 'paused', 'archived', 'prospect');
      END IF;

      -- clients: brand_tier
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_clients_brand_tier' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_clients_brand_tier"
          AS ENUM('flagship', 'growth', 'maintenance', 'internal');
      END IF;

      -- clients: relationship_status
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_clients_relationship_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_clients_relationship_status"
          AS ENUM('healthy', 'needs-attention', 'at-risk', 'paused');
      END IF;

      -- retainers: billing_cadence
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_retainers_billing_cadence' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_retainers_billing_cadence"
          AS ENUM('monthly', 'quarterly', 'annual', 'project-based');
      END IF;

      -- retainers: billing_status
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_retainers_billing_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_retainers_billing_status"
          AS ENUM('active', 'paused', 'overdue', 'ended');
      END IF;

      -- client_projects: project_type
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_projects_project_type' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_projects_project_type"
          AS ENUM('website', 'brand', 'platform', 'seo', 'content', 'consulting', 'support', 'other');
      END IF;

      -- client_projects: status
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_projects_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_projects_status"
          AS ENUM('planning', 'active', 'waiting-on-client', 'review', 'launched', 'paused', 'archived');
      END IF;

      -- client_projects / client_requests: priority (shared enum name per table)
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_projects_priority' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_projects_priority"
          AS ENUM('low', 'normal', 'high', 'urgent');
      END IF;

      -- monthly_deliverables: category
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_monthly_deliverables_category' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_monthly_deliverables_category"
          AS ENUM('website', 'seo', 'content', 'reporting', 'strategy', 'support', 'design', 'development', 'admin');
      END IF;

      -- monthly_deliverables: status
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_monthly_deliverables_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_monthly_deliverables_status"
          AS ENUM('not-started', 'in-progress', 'waiting-on-client', 'complete', 'blocked');
      END IF;

      -- client_requests: request_type
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_requests_request_type' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_requests_request_type"
          AS ENUM('update', 'bug', 'design', 'content', 'seo', 'strategy', 'billing', 'access', 'other');
      END IF;

      -- client_requests: status
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_requests_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_requests_status"
          AS ENUM('new', 'triaged', 'in-progress', 'waiting-on-client', 'complete', 'declined');
      END IF;

      -- client_requests: priority
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_requests_priority' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_requests_priority"
          AS ENUM('low', 'normal', 'high', 'urgent');
      END IF;

    END$$;
  `);

  // ── 2. clients ───────────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "clients" (
      "id"                      serial PRIMARY KEY NOT NULL,
      "name"                    varchar NOT NULL,
      "slug"                    varchar NOT NULL,
      "status"                  "public"."enum_clients_status" DEFAULT 'active' NOT NULL,
      "primary_contact_name"    varchar,
      "primary_contact_email"   varchar,
      "company_website"         varchar,
      "brand_tier"              "public"."enum_clients_brand_tier",
      "monthly_retainer_amount" numeric(12,2),
      "billing_day"             integer,
      "next_billing_date"       timestamp(3) with time zone,
      "notes"                   varchar,
      "relationship_status"     "public"."enum_clients_relationship_status" DEFAULT 'healthy',
      "next_action"             varchar,
      "next_action_due_date"    timestamp(3) with time zone,
      "updated_at"              timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"              timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "clients_slug_idx"
      ON "clients" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "clients_status_idx"
      ON "clients" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "clients_created_at_idx"
      ON "clients" USING btree ("created_at" DESC);
  `);

  // ── 3. retainers ─────────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "retainers" (
      "id"               serial PRIMARY KEY NOT NULL,
      "client_id"        integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "retainer_name"    varchar NOT NULL,
      "monthly_amount"   numeric(12,2),
      "billing_cadence"  "public"."enum_retainers_billing_cadence" DEFAULT 'monthly',
      "billing_status"   "public"."enum_retainers_billing_status" DEFAULT 'active' NOT NULL,
      "scope_summary"    varchar,
      "included_services" varchar,
      "start_date"       timestamp(3) with time zone,
      "renewal_date"     timestamp(3) with time zone,
      "next_invoice_date" timestamp(3) with time zone,
      "notes"            varchar,
      "updated_at"       timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"       timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "retainers_client_idx"
      ON "retainers" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "retainers_billing_status_idx"
      ON "retainers" USING btree ("billing_status");
    CREATE INDEX IF NOT EXISTS "retainers_created_at_idx"
      ON "retainers" USING btree ("created_at" DESC);
  `);

  // ── 4. client_projects ───────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_projects" (
      "id"                    serial PRIMARY KEY NOT NULL,
      "client_id"             integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "project_name"          varchar NOT NULL,
      "project_type"          "public"."enum_client_projects_project_type",
      "status"                "public"."enum_client_projects_status" DEFAULT 'planning' NOT NULL,
      "priority"              "public"."enum_client_projects_priority" DEFAULT 'normal' NOT NULL,
      "start_date"            timestamp(3) with time zone,
      "target_launch_date"    timestamp(3) with time zone,
      "live_url"              varchar,
      "repo_url"              varchar,
      "vercel_project"        varchar,
      "next_action"           varchar,
      "next_action_due_date"  timestamp(3) with time zone,
      "notes"                 varchar,
      "updated_at"            timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"            timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_projects_client_idx"
      ON "client_projects" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_projects_status_idx"
      ON "client_projects" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_projects_priority_idx"
      ON "client_projects" USING btree ("priority");
    CREATE INDEX IF NOT EXISTS "client_projects_created_at_idx"
      ON "client_projects" USING btree ("created_at" DESC);
  `);

  // ── 5. monthly_deliverables ──────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_deliverables" (
      "id"                  serial PRIMARY KEY NOT NULL,
      "client_id"           integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"  integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "title"               varchar NOT NULL,
      "month"               integer,
      "year"                integer,
      "category"            "public"."enum_monthly_deliverables_category",
      "status"              "public"."enum_monthly_deliverables_status" DEFAULT 'not-started' NOT NULL,
      "due_date"            timestamp(3) with time zone,
      "completed_date"      timestamp(3) with time zone,
      "owner"               varchar,
      "notes"               varchar,
      "updated_at"          timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"          timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "monthly_deliverables_client_idx"
      ON "monthly_deliverables" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "monthly_deliverables_project_idx"
      ON "monthly_deliverables" USING btree ("related_project_id");
    CREATE INDEX IF NOT EXISTS "monthly_deliverables_status_idx"
      ON "monthly_deliverables" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "monthly_deliverables_year_month_idx"
      ON "monthly_deliverables" USING btree ("year" DESC, "month" DESC);
    CREATE INDEX IF NOT EXISTS "monthly_deliverables_created_at_idx"
      ON "monthly_deliverables" USING btree ("created_at" DESC);
  `);

  // ── 6. client_requests ───────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_requests" (
      "id"                  serial PRIMARY KEY NOT NULL,
      "client_id"           integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"  integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "request_title"       varchar NOT NULL,
      "request_type"        "public"."enum_client_requests_request_type",
      "status"              "public"."enum_client_requests_status" DEFAULT 'new' NOT NULL,
      "priority"            "public"."enum_client_requests_priority" DEFAULT 'normal' NOT NULL,
      "requested_by"        varchar,
      "requested_by_email"  varchar,
      "request_details"     varchar,
      "internal_notes"      varchar,
      "due_date"            timestamp(3) with time zone,
      "completed_date"      timestamp(3) with time zone,
      "updated_at"          timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"          timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_requests_client_idx"
      ON "client_requests" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_requests_project_idx"
      ON "client_requests" USING btree ("related_project_id");
    CREATE INDEX IF NOT EXISTS "client_requests_status_idx"
      ON "client_requests" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_requests_priority_idx"
      ON "client_requests" USING btree ("priority");
    CREATE INDEX IF NOT EXISTS "client_requests_created_at_idx"
      ON "client_requests" USING btree ("created_at" DESC);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop tables in reverse FK dependency order.
  await db.execute(sql`
    DROP TABLE IF EXISTS "client_requests"      CASCADE;
    DROP TABLE IF EXISTS "monthly_deliverables" CASCADE;
    DROP TABLE IF EXISTS "client_projects"      CASCADE;
    DROP TABLE IF EXISTS "retainers"            CASCADE;
    DROP TABLE IF EXISTS "clients"              CASCADE;
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_requests_priority";
    DROP TYPE IF EXISTS "public"."enum_client_requests_status";
    DROP TYPE IF EXISTS "public"."enum_client_requests_request_type";
    DROP TYPE IF EXISTS "public"."enum_monthly_deliverables_status";
    DROP TYPE IF EXISTS "public"."enum_monthly_deliverables_category";
    DROP TYPE IF EXISTS "public"."enum_client_projects_priority";
    DROP TYPE IF EXISTS "public"."enum_client_projects_status";
    DROP TYPE IF EXISTS "public"."enum_client_projects_project_type";
    DROP TYPE IF EXISTS "public"."enum_retainers_billing_status";
    DROP TYPE IF EXISTS "public"."enum_retainers_billing_cadence";
    DROP TYPE IF EXISTS "public"."enum_clients_relationship_status";
    DROP TYPE IF EXISTS "public"."enum_clients_brand_tier";
    DROP TYPE IF EXISTS "public"."enum_clients_status";
  `);
}
