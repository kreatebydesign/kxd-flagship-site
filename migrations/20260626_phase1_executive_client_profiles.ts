/**
 * KXD OS Phase 1 — Executive Client Profiles
 * Linked 1:1 executive intelligence layer for Clients.
 * All statements idempotent. Safe for production.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_executive_client_profiles_client_tier'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_executive_client_profiles_client_tier"
          AS ENUM('A', 'B', 'C');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_executive_client_profiles_relationship_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_executive_client_profiles_relationship_status"
          AS ENUM('active', 'paused', 'at-risk', 'archived');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_executive_client_profiles_case_study_potential'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_executive_client_profiles_case_study_potential"
          AS ENUM('low', 'medium', 'high', 'flagship');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_executive_client_profiles_referral_potential'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_executive_client_profiles_referral_potential"
          AS ENUM('low', 'medium', 'high');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_executive_client_profiles_productization_potential'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_executive_client_profiles_productization_potential"
          AS ENUM('low', 'medium', 'high');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_executive_client_profiles_internal_priority'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_executive_client_profiles_internal_priority"
          AS ENUM('low', 'medium', 'high', 'critical');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_client_profiles" (
      "id"                          serial PRIMARY KEY NOT NULL,
      "profile_title"               varchar,
      "client_id"                   integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "executive_summary"           varchar,
      "client_tier"                 "public"."enum_executive_client_profiles_client_tier",
      "client_health_score"         numeric,
      "relationship_status"         "public"."enum_executive_client_profiles_relationship_status" DEFAULT 'active',
      "current_monthly_revenue"     numeric,
      "estimated_annual_value"      numeric,
      "potential_monthly_revenue"   numeric,
      "primary_decision_maker"      varchar,
      "current_services"            varchar,
      "active_projects_summary"     varchar,
      "strategic_notes"             varchar,
      "growth_opportunities"        varchar,
      "upsell_opportunities"        varchar,
      "risk_notes"                  varchar,
      "next_action"                 varchar,
      "next_action_due_date"        timestamp(3) with time zone,
      "case_study_potential"        "public"."enum_executive_client_profiles_case_study_potential",
      "referral_potential"          "public"."enum_executive_client_profiles_referral_potential",
      "productization_potential"    "public"."enum_executive_client_profiles_productization_potential",
      "internal_priority"           "public"."enum_executive_client_profiles_internal_priority",
      "production_url"              varchar,
      "staging_url"                 varchar,
      "github_repo"                 varchar,
      "vercel_project"              varchar,
      "domain_registrar"            varchar,
      "dns_provider"                varchar,
      "analytics_status"            varchar,
      "search_console_status"       varchar,
      "workspace_status"            varchar,
      "api_integrations"            varchar,
      "login_notes_reference"       varchar,
      "updated_at"                  timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"                  timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_client_profiles_secondary_contacts" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL REFERENCES "executive_client_profiles"("id") ON DELETE CASCADE,
      "id"          varchar PRIMARY KEY NOT NULL,
      "name"        varchar,
      "role"        varchar,
      "email"       varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_client_profiles_important_links" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL REFERENCES "executive_client_profiles"("id") ON DELETE CASCADE,
      "id"          varchar PRIMARY KEY NOT NULL,
      "label"       varchar,
      "url"         varchar
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "executive_client_profiles_client_id_idx"
      ON "executive_client_profiles" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "executive_client_profiles_priority_idx"
      ON "executive_client_profiles" USING btree ("internal_priority");
    CREATE INDEX IF NOT EXISTS "executive_client_profiles_tier_idx"
      ON "executive_client_profiles" USING btree ("client_tier");
    CREATE INDEX IF NOT EXISTS "executive_client_profiles_secondary_contacts_parent_idx"
      ON "executive_client_profiles_secondary_contacts"("_parent_id");
    CREATE INDEX IF NOT EXISTS "executive_client_profiles_important_links_parent_idx"
      ON "executive_client_profiles_important_links"("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "executive_client_profiles_important_links_parent_idx";
    DROP INDEX IF EXISTS "executive_client_profiles_secondary_contacts_parent_idx";
    DROP INDEX IF EXISTS "executive_client_profiles_tier_idx";
    DROP INDEX IF EXISTS "executive_client_profiles_priority_idx";
    DROP INDEX IF EXISTS "executive_client_profiles_client_id_idx";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "executive_client_profiles_important_links" CASCADE;
    DROP TABLE IF EXISTS "executive_client_profiles_secondary_contacts" CASCADE;
    DROP TABLE IF EXISTS "executive_client_profiles" CASCADE;
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_executive_client_profiles_internal_priority";
    DROP TYPE IF EXISTS "public"."enum_executive_client_profiles_productization_potential";
    DROP TYPE IF EXISTS "public"."enum_executive_client_profiles_referral_potential";
    DROP TYPE IF EXISTS "public"."enum_executive_client_profiles_case_study_potential";
    DROP TYPE IF EXISTS "public"."enum_executive_client_profiles_relationship_status";
    DROP TYPE IF EXISTS "public"."enum_executive_client_profiles_client_tier";
  `);
}
