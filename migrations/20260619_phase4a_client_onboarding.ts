/**
 * KXD OS Phase 4A — Client Onboarding System
 * Creates client_onboarding table, rels for media uploads, and client summary mirror fields.
 * All statements idempotent. Safe for production.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Enum: onboarding status ─────────────────────────────────────────────

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_onboarding_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_onboarding_status"
          AS ENUM('draft', 'sent', 'in-progress', 'submitted', 'approved');
      END IF;
    END$$;
  `);

  // ── 2. client_onboarding table ─────────────────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_onboarding" (
      "id"                          serial PRIMARY KEY NOT NULL,
      "client_id"                   integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "status"                      "public"."enum_client_onboarding_status" DEFAULT 'draft' NOT NULL,
      "business_name"               varchar NOT NULL,
      "dba"                         varchar,
      "primary_contact"             varchar,
      "email"                       varchar,
      "phone"                       varchar,
      "address"                     varchar,
      "city"                        varchar,
      "state"                       varchar,
      "zip"                         varchar,
      "industry"                    varchar,
      "years_in_business"           varchar,
      "service_areas"               varchar,
      "short_business_description"  varchar,
      "current_website"             varchar,
      "hosting_provider"            varchar,
      "domain_registrar"            varchar,
      "analytics_connected"         boolean DEFAULT false,
      "facebook"                    varchar,
      "instagram"                   varchar,
      "linkedin"                    varchar,
      "youtube"                     varchar,
      "tiktok"                      varchar,
      "primary_goal"                varchar,
      "success_definition"          varchar,
      "biggest_pain_point"          varchar,
      "top_competitors"             varchar,
      "website_access"              boolean DEFAULT false,
      "domain_access"               boolean DEFAULT false,
      "hosting_access"              boolean DEFAULT false,
      "social_media_access"         boolean DEFAULT false,
      "analytics_access"            boolean DEFAULT false,
      "email_access"                boolean DEFAULT false,
      "notes"                       varchar,
      "submitted_at"                timestamp(3) with time zone,
      "approved_at"                 timestamp(3) with time zone,
      "updated_at"                  timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"                  timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  // ── 3. Rels table for hasMany media uploads ──────────────────────────────────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_onboarding_rels" (
      "id"        serial PRIMARY KEY,
      "order"     integer,
      "parent_id" integer NOT NULL REFERENCES "client_onboarding"("id") ON DELETE CASCADE,
      "path"      varchar NOT NULL,
      "media_id"  integer REFERENCES "media"("id") ON DELETE CASCADE
    );
  `);

  // ── 4. Client mirror fields (onboarding panel on Client records) ─────────────

  await db.execute(sql`
    ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "os_onboarding_record_id"       integer,
      ADD COLUMN IF NOT EXISTS "os_onboarding_status"            varchar,
      ADD COLUMN IF NOT EXISTS "os_onboarding_readiness_score"   integer,
      ADD COLUMN IF NOT EXISTS "os_onboarding_readiness_label" varchar,
      ADD COLUMN IF NOT EXISTS "os_onboarding_missing_sections"  varchar,
      ADD COLUMN IF NOT EXISTS "os_onboarding_submitted_at"      timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "os_onboarding_dashboard_link"  varchar;
  `);

  // ── 5. Indexes ───────────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_onboarding_client_idx"
      ON "client_onboarding" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_onboarding_status_idx"
      ON "client_onboarding" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_onboarding_created_at_idx"
      ON "client_onboarding" USING btree ("created_at" DESC);
    CREATE INDEX IF NOT EXISTS "client_onboarding_rels_parent_idx"
      ON "client_onboarding_rels"("parent_id");
    CREATE INDEX IF NOT EXISTS "client_onboarding_rels_path_idx"
      ON "client_onboarding_rels"("path");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_onboarding_rels_parent_idx";
    DROP INDEX IF EXISTS "client_onboarding_rels_path_idx";
    DROP INDEX IF EXISTS "client_onboarding_client_idx";
    DROP INDEX IF EXISTS "client_onboarding_status_idx";
    DROP INDEX IF EXISTS "client_onboarding_created_at_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "clients"
      DROP COLUMN IF EXISTS "os_onboarding_record_id",
      DROP COLUMN IF EXISTS "os_onboarding_status",
      DROP COLUMN IF EXISTS "os_onboarding_readiness_score",
      DROP COLUMN IF EXISTS "os_onboarding_readiness_label",
      DROP COLUMN IF EXISTS "os_onboarding_missing_sections",
      DROP COLUMN IF EXISTS "os_onboarding_submitted_at",
      DROP COLUMN IF EXISTS "os_onboarding_dashboard_link";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "client_onboarding_rels" CASCADE;
    DROP TABLE IF EXISTS "client_onboarding" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_client_onboarding_status";
  `);
}
