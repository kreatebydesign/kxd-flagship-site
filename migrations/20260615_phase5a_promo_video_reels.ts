/**
 * Phase 5A — Website Reel Generator: additive schema additions for promo_video_requests.
 *
 * The original 20260610_kxd_creative_engine migration created promo_video_requests
 * with only the pre-Phase-5A fields. Phase 5A added:
 *   — is_website_reel flag (sidebar checkbox)
 *   — client_name override
 *   — Screenshot capture fields (status, error, captured_at)
 *   — Storyboard generation fields (reel_title, reel_hook, scene_sequence,
 *     transition_style, caption_options, cta_text, generation status, etc.)
 *   — brand_kit_id FK (missing from original migration)
 *   — 'storyboarding' enum value for status
 *
 * The capturedScreenshots hasMany relationship (→ media) creates a Payload internal
 * rels table; we add it here so Payload can read/write it without schema drift errors.
 *
 * Root cause of "Failed to create reel request.":
 *   payload.create({ isWebsiteReel: true, ... }) → Postgres throws
 *   'column "is_website_reel" of relation "promo_video_requests" does not exist'
 *   → caught by generic catch block → "Failed to create reel request."
 *
 * All statements are idempotent (ADD COLUMN IF NOT EXISTS / IF NOT EXISTS guards).
 * Safe against production Neon. Does NOT alter or drop any existing columns.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. Extend status enum with 'storyboarding' ────────────────────────────

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_promo_video_requests_status'
          AND e.enumlabel = 'storyboarding'
      ) THEN
        ALTER TYPE "public"."enum_promo_video_requests_status" ADD VALUE 'storyboarding';
      END IF;
    END
    $$;
  `);

  // ── 2. New enum types for Phase 5A fields ────────────────────────────────

  await db.execute(sql`
    DO $$
    BEGIN

      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_promo_video_requests_screenshot_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_promo_video_requests_screenshot_status"
          AS ENUM('idle', 'capturing', 'complete', 'failed');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_promo_video_requests_storyboard_generation_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_promo_video_requests_storyboard_generation_status"
          AS ENUM('idle', 'generating', 'complete', 'failed');
      END IF;

    END
    $$;
  `);

  // ── 3. Add Phase 5A columns to promo_video_requests ──────────────────────

  await db.execute(sql`
    ALTER TABLE "promo_video_requests"

      -- brand kit FK (was missing from original Phase 3A migration)
      ADD COLUMN IF NOT EXISTS "brand_kit_id"
        integer REFERENCES "brand_kits"("id") ON DELETE SET NULL,

      -- Website Reel flag
      ADD COLUMN IF NOT EXISTS "is_website_reel"
        boolean DEFAULT false NOT NULL,

      -- Client display name override
      ADD COLUMN IF NOT EXISTS "client_name"
        varchar,

      -- Screenshot capture
      ADD COLUMN IF NOT EXISTS "screenshot_status"
        "public"."enum_promo_video_requests_screenshot_status" DEFAULT 'idle',
      ADD COLUMN IF NOT EXISTS "screenshot_error"
        varchar,
      ADD COLUMN IF NOT EXISTS "screenshots_captured_at"
        timestamp with time zone,

      -- Reel storyboard content
      ADD COLUMN IF NOT EXISTS "reel_title"
        varchar,
      ADD COLUMN IF NOT EXISTS "reel_hook"
        text,
      ADD COLUMN IF NOT EXISTS "scene_sequence"
        text,
      ADD COLUMN IF NOT EXISTS "transition_style"
        varchar,
      ADD COLUMN IF NOT EXISTS "caption_options"
        text,
      ADD COLUMN IF NOT EXISTS "cta_text"
        varchar,

      -- Storyboard generation lifecycle
      ADD COLUMN IF NOT EXISTS "storyboard_generation_status"
        "public"."enum_promo_video_requests_storyboard_generation_status" DEFAULT 'idle',
      ADD COLUMN IF NOT EXISTS "storyboard_generated_at"
        timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "storyboard_generation_error"
        varchar,
      ADD COLUMN IF NOT EXISTS "storyboard_prompt"
        text;
  `);

  // ── 4. Payload rels table for capturedScreenshots (hasMany → media) ──────

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "promo_video_requests_rels" (
      "id"                      serial PRIMARY KEY,
      "order"                   integer,
      "parent_id"               integer NOT NULL REFERENCES "promo_video_requests"("id") ON DELETE CASCADE,
      "path"                    varchar NOT NULL,
      "media_id"                integer REFERENCES "media"("id") ON DELETE CASCADE
    );
  `);

  // ── 5. Indexes ────────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "promo_video_requests_is_website_reel_idx"
      ON "promo_video_requests"("is_website_reel");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_screenshot_status_idx"
      ON "promo_video_requests"("screenshot_status");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_storyboard_status_idx"
      ON "promo_video_requests"("storyboard_generation_status");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_brand_kit_idx"
      ON "promo_video_requests"("brand_kit_id");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_rels_parent_idx"
      ON "promo_video_requests_rels"("parent_id");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_rels_path_idx"
      ON "promo_video_requests_rels"("path");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "promo_video_requests_is_website_reel_idx";
    DROP INDEX IF EXISTS "promo_video_requests_screenshot_status_idx";
    DROP INDEX IF EXISTS "promo_video_requests_storyboard_status_idx";
    DROP INDEX IF EXISTS "promo_video_requests_brand_kit_idx";
    DROP INDEX IF EXISTS "promo_video_requests_rels_parent_idx";
    DROP INDEX IF EXISTS "promo_video_requests_rels_path_idx";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "promo_video_requests_rels";
  `);

  await db.execute(sql`
    ALTER TABLE "promo_video_requests"
      DROP COLUMN IF EXISTS "brand_kit_id",
      DROP COLUMN IF EXISTS "is_website_reel",
      DROP COLUMN IF EXISTS "client_name",
      DROP COLUMN IF EXISTS "screenshot_status",
      DROP COLUMN IF EXISTS "screenshot_error",
      DROP COLUMN IF EXISTS "screenshots_captured_at",
      DROP COLUMN IF EXISTS "reel_title",
      DROP COLUMN IF EXISTS "reel_hook",
      DROP COLUMN IF EXISTS "scene_sequence",
      DROP COLUMN IF EXISTS "transition_style",
      DROP COLUMN IF EXISTS "caption_options",
      DROP COLUMN IF EXISTS "cta_text",
      DROP COLUMN IF EXISTS "storyboard_generation_status",
      DROP COLUMN IF EXISTS "storyboard_generated_at",
      DROP COLUMN IF EXISTS "storyboard_generation_error",
      DROP COLUMN IF EXISTS "storyboard_prompt";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_screenshot_status"            CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_storyboard_generation_status" CASCADE;
  `);
}
