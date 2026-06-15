/**
 * Phase 4A — Creative Production Engine: additive schema additions.
 *
 * Adds generation lifecycle columns to flyer_requests and social_post_requests,
 * and adds brand_kit_id FK columns to both (originally missing from the Phase 3A
 * migration despite the collection definitions including the brandKit relationship).
 * Also adds usage_context + is_approved to brand_kit_assets.
 *
 * All statements are fully idempotent:
 *   — ADD COLUMN IF NOT EXISTS
 *   — DO $$ / IF NOT EXISTS for enum types
 *   — IF NOT EXISTS for indexes
 *
 * Safe against production Neon. Does NOT alter or drop any existing columns,
 * tables, or types. Does NOT rename _order / _parent_id columns.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. New enum types ─────────────────────────────────────────────────────

  await db.execute(sql`
    DO $$
    BEGIN

      -- generation status for flyer_requests and social_post_requests
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_flyer_requests_generation_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_flyer_requests_generation_status"
          AS ENUM('not-started', 'generating', 'complete', 'failed');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_social_post_requests_generation_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_social_post_requests_generation_status"
          AS ENUM('not-started', 'generating', 'complete', 'failed');
      END IF;

      -- usage_context for brand_kit_assets
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_brand_kit_assets_usage_context'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_brand_kit_assets_usage_context"
          AS ENUM('print', 'digital', 'social', 'email', 'flyer', 'presentation', 'all');
      END IF;

    END
    $$;
  `);

  // ── 2. flyer_requests — new columns ──────────────────────────────────────

  await db.execute(sql`
    ALTER TABLE "flyer_requests"
      -- brand kit FK (was missing from original Phase 3A migration)
      ADD COLUMN IF NOT EXISTS "brand_kit_id"
        integer REFERENCES "brand_kits"("id") ON DELETE SET NULL,

      -- Phase 4A generation lifecycle
      ADD COLUMN IF NOT EXISTS "generation_status"
        "public"."enum_flyer_requests_generation_status" DEFAULT 'not-started',
      ADD COLUMN IF NOT EXISTS "generation_prompt"
        text,
      ADD COLUMN IF NOT EXISTS "generation_error"
        text,
      ADD COLUMN IF NOT EXISTS "generated_at"
        timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "generated_creative_direction"
        text,
      ADD COLUMN IF NOT EXISTS "generated_export_url"
        varchar;
  `);

  // ── 3. social_post_requests — new columns ─────────────────────────────────

  await db.execute(sql`
    ALTER TABLE "social_post_requests"
      -- brand kit FK (was missing from original Phase 3A migration)
      ADD COLUMN IF NOT EXISTS "brand_kit_id"
        integer REFERENCES "brand_kits"("id") ON DELETE SET NULL,

      -- Phase 4A generation lifecycle
      ADD COLUMN IF NOT EXISTS "generation_status"
        "public"."enum_social_post_requests_generation_status" DEFAULT 'not-started',
      ADD COLUMN IF NOT EXISTS "generation_prompt"
        text,
      ADD COLUMN IF NOT EXISTS "generation_error"
        text,
      ADD COLUMN IF NOT EXISTS "generated_at"
        timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "generated_alt_text"
        varchar,
      ADD COLUMN IF NOT EXISTS "generated_graphic_direction"
        text,
      ADD COLUMN IF NOT EXISTS "generated_export_url"
        varchar;
  `);

  // ── 4. brand_kit_assets — new columns ────────────────────────────────────

  await db.execute(sql`
    ALTER TABLE "brand_kit_assets"
      ADD COLUMN IF NOT EXISTS "usage_context"
        "public"."enum_brand_kit_assets_usage_context",
      ADD COLUMN IF NOT EXISTS "is_approved"
        boolean DEFAULT false NOT NULL;
  `);

  // ── 5. Indexes ────────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "flyer_requests_brand_kit_idx"
      ON "flyer_requests"("brand_kit_id");
    CREATE INDEX IF NOT EXISTS "flyer_requests_generation_status_idx"
      ON "flyer_requests"("generation_status");

    CREATE INDEX IF NOT EXISTS "social_post_requests_brand_kit_idx"
      ON "social_post_requests"("brand_kit_id");
    CREATE INDEX IF NOT EXISTS "social_post_requests_generation_status_idx"
      ON "social_post_requests"("generation_status");

    CREATE INDEX IF NOT EXISTS "brand_kit_assets_is_approved_idx"
      ON "brand_kit_assets"("is_approved");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Revert indexes
  await db.execute(sql`
    DROP INDEX IF EXISTS "flyer_requests_brand_kit_idx";
    DROP INDEX IF EXISTS "flyer_requests_generation_status_idx";
    DROP INDEX IF EXISTS "social_post_requests_brand_kit_idx";
    DROP INDEX IF EXISTS "social_post_requests_generation_status_idx";
    DROP INDEX IF EXISTS "brand_kit_assets_is_approved_idx";
  `);

  // Revert columns (additive-only; down reverts them)
  await db.execute(sql`
    ALTER TABLE "flyer_requests"
      DROP COLUMN IF EXISTS "brand_kit_id",
      DROP COLUMN IF EXISTS "generation_status",
      DROP COLUMN IF EXISTS "generation_prompt",
      DROP COLUMN IF EXISTS "generation_error",
      DROP COLUMN IF EXISTS "generated_at",
      DROP COLUMN IF EXISTS "generated_creative_direction",
      DROP COLUMN IF EXISTS "generated_export_url";

    ALTER TABLE "social_post_requests"
      DROP COLUMN IF EXISTS "brand_kit_id",
      DROP COLUMN IF EXISTS "generation_status",
      DROP COLUMN IF EXISTS "generation_prompt",
      DROP COLUMN IF EXISTS "generation_error",
      DROP COLUMN IF EXISTS "generated_at",
      DROP COLUMN IF EXISTS "generated_alt_text",
      DROP COLUMN IF EXISTS "generated_graphic_direction",
      DROP COLUMN IF EXISTS "generated_export_url";

    ALTER TABLE "brand_kit_assets"
      DROP COLUMN IF EXISTS "usage_context",
      DROP COLUMN IF EXISTS "is_approved";
  `);

  // Revert enum types
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_flyer_requests_generation_status"         CASCADE;
    DROP TYPE IF EXISTS "public"."enum_social_post_requests_generation_status"   CASCADE;
    DROP TYPE IF EXISTS "public"."enum_brand_kit_assets_usage_context"           CASCADE;
  `);
}
