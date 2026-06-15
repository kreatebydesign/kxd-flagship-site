/**
 * Phase 5B — Reel Renderer: additive schema additions for promo_video_requests.
 *
 * Root causes fixed by this migration:
 *
 *   1. Missing Phase 5A enum values — platform and visual_style enum types were
 *      created in 20260610_kxd_creative_engine but Phase 5A never added the new
 *      values (instagram-reel, facebook-reel, tiktok, launch-reveal, case-study).
 *      Selecting any of these in the ReelForm caused Postgres to throw:
 *        "invalid input value for enum …_platform: 'instagram-reel'"
 *      which was caught by the generic handler → "Failed to create reel request."
 *
 *   2. Missing render columns — Phase 5B (MP4 renderer) added render_status,
 *      render_version, rendered_video_url, rendered_video_asset_id, render_started_at,
 *      render_completed_at, render_error, render_duration_ms to the Payload
 *      collection schema but no migration was ever created for them.  Any call to
 *      payload.update({ renderStatus: "rendering" }) caused Postgres to throw:
 *        "column 'render_status' of relation 'promo_video_requests' does not exist"
 *
 * All statements are fully idempotent:
 *   — ALTER TYPE … ADD VALUE inside DO $$ / IF NOT EXISTS guards
 *   — ADD COLUMN IF NOT EXISTS
 *   — CREATE TYPE … IF NOT EXISTS
 *   — CREATE INDEX IF NOT EXISTS
 *
 * Safe against production Neon. Does NOT alter or drop any existing columns,
 * tables, or enum values.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. Add missing platform enum values (Phase 5A oversight) ─────────────
  //
  // Original enum (from 20260610_kxd_creative_engine):
  //   ENUM('facebook','instagram','reels','stories','linkedin','youtube','website','other')
  //
  // Phase 5A added these options to the Payload collection but forgot the migration:
  //   instagram-reel, facebook-reel, tiktok

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_promo_video_requests_platform'
          AND e.enumlabel = 'instagram-reel'
      ) THEN
        ALTER TYPE "public"."enum_promo_video_requests_platform" ADD VALUE 'instagram-reel';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_promo_video_requests_platform'
          AND e.enumlabel = 'facebook-reel'
      ) THEN
        ALTER TYPE "public"."enum_promo_video_requests_platform" ADD VALUE 'facebook-reel';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_promo_video_requests_platform'
          AND e.enumlabel = 'tiktok'
      ) THEN
        ALTER TYPE "public"."enum_promo_video_requests_platform" ADD VALUE 'tiktok';
      END IF;
    END
    $$;
  `);

  // ── 2. Add missing visual_style enum values (Phase 5A oversight) ─────────
  //
  // Original enum (from 20260610_kxd_creative_engine):
  //   ENUM('cinematic','luxury','editorial','energetic','minimal','bold','documentary','other')
  //
  // Phase 5A added these options to the Payload collection but forgot the migration:
  //   launch-reveal, case-study

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_promo_video_requests_visual_style'
          AND e.enumlabel = 'launch-reveal'
      ) THEN
        ALTER TYPE "public"."enum_promo_video_requests_visual_style" ADD VALUE 'launch-reveal';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_promo_video_requests_visual_style'
          AND e.enumlabel = 'case-study'
      ) THEN
        ALTER TYPE "public"."enum_promo_video_requests_visual_style" ADD VALUE 'case-study';
      END IF;
    END
    $$;
  `);

  // ── 3. Create render_status enum type ────────────────────────────────────

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_promo_video_requests_render_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_promo_video_requests_render_status"
          AS ENUM('idle', 'rendering', 'complete', 'failed');
      END IF;
    END
    $$;
  `);

  // ── 4. Add Phase 5B render columns to promo_video_requests ───────────────
  //
  // Sidebar fields:
  //   render_status  — select enum (idle / rendering / complete / failed)
  //   render_version — increments on each successful render
  //
  // Render tab fields:
  //   rendered_video_url      — local path or CDN URL of the output MP4
  //   rendered_video_asset_id — FK → media (optional Payload Media record)
  //   render_started_at       — timestamp when last render began
  //   render_completed_at     — timestamp when last render finished
  //   render_error            — last render error message
  //   render_duration_ms      — wall-clock render time

  await db.execute(sql`
    ALTER TABLE "promo_video_requests"

      -- Sidebar
      ADD COLUMN IF NOT EXISTS "render_status"
        "public"."enum_promo_video_requests_render_status" DEFAULT 'idle',
      ADD COLUMN IF NOT EXISTS "render_version"
        integer DEFAULT 0 NOT NULL,

      -- Render tab
      ADD COLUMN IF NOT EXISTS "rendered_video_url"
        varchar,
      ADD COLUMN IF NOT EXISTS "rendered_video_asset_id"
        integer REFERENCES "media"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "render_started_at"
        timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "render_completed_at"
        timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "render_error"
        varchar,
      ADD COLUMN IF NOT EXISTS "render_duration_ms"
        integer;
  `);

  // ── 5. Indexes ────────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "promo_video_requests_render_status_idx"
      ON "promo_video_requests"("render_status");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_rendered_video_asset_idx"
      ON "promo_video_requests"("rendered_video_asset_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "promo_video_requests_render_status_idx";
    DROP INDEX IF EXISTS "promo_video_requests_rendered_video_asset_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "promo_video_requests"
      DROP COLUMN IF EXISTS "render_status",
      DROP COLUMN IF EXISTS "render_version",
      DROP COLUMN IF EXISTS "rendered_video_url",
      DROP COLUMN IF EXISTS "rendered_video_asset_id",
      DROP COLUMN IF EXISTS "render_started_at",
      DROP COLUMN IF EXISTS "render_completed_at",
      DROP COLUMN IF EXISTS "render_error",
      DROP COLUMN IF EXISTS "render_duration_ms";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_render_status" CASCADE;
  `);

  // NOTE: PostgreSQL does not support removing enum values.
  // The platform and visual_style enum values added above cannot be rolled back
  // without recreating the enum type and altering all columns that use it.
  // This is intentionally left as a no-op for safety.
}
