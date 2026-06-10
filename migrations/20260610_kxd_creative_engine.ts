/**
 * KXD Creative Engine — Phase 3A data foundation.
 * Creates: creative_campaigns, brand_kits, brand_kit_assets,
 *          flyer_requests, promo_video_requests, social_post_requests,
 *          creative_assets, and the creative_campaigns_platforms join table.
 *
 * All statements are idempotent (IF NOT EXISTS / DO $$ guards).
 * Safe to run against production. Does NOT alter or drop any existing tables.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. Enum types ─────────────────────────────────────────────────────────

  await db.execute(sql`
    DO $$
    BEGIN

      -- creative_campaigns: campaign_type
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_creative_campaigns_campaign_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_creative_campaigns_campaign_type"
          AS ENUM('launch','event','promotion','seasonal','content-series','website-launch','brand-launch','announcement','other');
      END IF;

      -- creative_campaigns: status
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_creative_campaigns_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_creative_campaigns_status"
          AS ENUM('draft','planning','active','in-review','approved','scheduled','published','archived');
      END IF;

      -- creative_campaigns: priority
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_creative_campaigns_priority' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_creative_campaigns_priority"
          AS ENUM('low','normal','high','urgent');
      END IF;

      -- creative_campaigns_platforms: value (join table enum)
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_creative_campaigns_platforms' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_creative_campaigns_platforms"
          AS ENUM('facebook','instagram','linkedin','website','email','print','reels','stories','youtube','other');
      END IF;

      -- brand_kits: status
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_brand_kits_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_brand_kits_status"
          AS ENUM('draft','in-review','approved','delivered','archived');
      END IF;

      -- brand_kit_assets: asset_type
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_brand_kit_assets_asset_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_brand_kit_assets_asset_type"
          AS ENUM('logo','color-palette','typography','moodboard','social-template','website-section','document','canva-link','other');
      END IF;

      -- brand_kit_assets: status
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_brand_kit_assets_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_brand_kit_assets_status"
          AS ENUM('draft','approved','delivered','archived');
      END IF;

      -- flyer_requests: flyer_type
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_flyer_requests_flyer_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_flyer_requests_flyer_type"
          AS ENUM('event','promotion','announcement','hiring','menu','fundraiser','launch','social-square','story','print','other');
      END IF;

      -- flyer_requests: status
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_flyer_requests_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_flyer_requests_status"
          AS ENUM('new','drafting','designing','review','approved','delivered','archived');
      END IF;

      -- flyer_requests: priority
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_flyer_requests_priority' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_flyer_requests_priority"
          AS ENUM('low','normal','high','urgent');
      END IF;

      -- flyer_requests: size_format
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_flyer_requests_size_format' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_flyer_requests_size_format"
          AS ENUM('square','story','portrait','landscape','letter','poster','custom');
      END IF;

      -- promo_video_requests: video_type
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_promo_video_requests_video_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_promo_video_requests_video_type"
          AS ENUM('website-launch','case-study','promo','highlight-reel','event-recap','product-service','testimonial','before-after','social-reel','other');
      END IF;

      -- promo_video_requests: status
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_promo_video_requests_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_promo_video_requests_status"
          AS ENUM('new','scripting','assets-needed','editing','review','approved','delivered','archived');
      END IF;

      -- promo_video_requests: priority
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_promo_video_requests_priority' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_promo_video_requests_priority"
          AS ENUM('low','normal','high','urgent');
      END IF;

      -- promo_video_requests: platform
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_promo_video_requests_platform' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_promo_video_requests_platform"
          AS ENUM('facebook','instagram','reels','stories','linkedin','youtube','website','other');
      END IF;

      -- promo_video_requests: aspect_ratio
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_promo_video_requests_aspect_ratio' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_promo_video_requests_aspect_ratio"
          AS ENUM('9:16','1:1','4:5','16:9','custom');
      END IF;

      -- promo_video_requests: duration_target
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_promo_video_requests_duration_target' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_promo_video_requests_duration_target"
          AS ENUM('15s','30s','45s','60s','90s','custom');
      END IF;

      -- promo_video_requests: visual_style
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_promo_video_requests_visual_style' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_promo_video_requests_visual_style"
          AS ENUM('cinematic','luxury','editorial','energetic','minimal','bold','documentary','other');
      END IF;

      -- social_post_requests: post_type
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_social_post_requests_post_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_social_post_requests_post_type"
          AS ENUM('announcement','launch','testimonial','promo','event','educational','behind-the-scenes','case-study','reminder','other');
      END IF;

      -- social_post_requests: status
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_social_post_requests_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_social_post_requests_status"
          AS ENUM('new','drafting','review','approved','scheduled','published','archived');
      END IF;

      -- social_post_requests: priority
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_social_post_requests_priority' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_social_post_requests_priority"
          AS ENUM('low','normal','high','urgent');
      END IF;

      -- social_post_requests: platform
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_social_post_requests_platform' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_social_post_requests_platform"
          AS ENUM('facebook','instagram','linkedin','website','email','other');
      END IF;

      -- creative_assets: asset_type
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_creative_assets_asset_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_creative_assets_asset_type"
          AS ENUM('logo','photo','screenshot','screen-recording','video-clip','flyer','social-graphic','brand-guide','copy-doc','canva-link','exported-file','other');
      END IF;

      -- creative_assets: status
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_creative_assets_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."enum_creative_assets_status"
          AS ENUM('raw','in-use','approved','delivered','archived');
      END IF;

    END;
    $$;
  `);

  // ── 2. Tables ────────────────────────────────────────────────────────────

  // creative_campaigns
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "creative_campaigns" (
      "id"                          serial PRIMARY KEY,
      "campaign_title"              varchar NOT NULL,
      "slug"                        varchar NOT NULL UNIQUE,
      "client_id"                   integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"          integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "campaign_type"               "public"."enum_creative_campaigns_campaign_type",
      "status"                      "public"."enum_creative_campaigns_status" NOT NULL DEFAULT 'draft',
      "priority"                    "public"."enum_creative_campaigns_priority" NOT NULL DEFAULT 'normal',
      "goal"                        text,
      "audience"                    text,
      "start_date"                  timestamp with time zone,
      "launch_date"                 timestamp with time zone,
      "deadline"                    timestamp with time zone,
      "campaign_message"            text,
      "primary_c_t_a"               varchar,
      "secondary_c_t_a"             varchar,
      "internal_notes"              text,
      "generated_post_copy"         text,
      "generated_caption"           text,
      "generated_email_copy"        text,
      "generated_video_script"      text,
      "generated_flyer_direction"   text,
      "next_action"                 varchar,
      "next_action_due_date"        timestamp with time zone,
      "updated_at"                  timestamp with time zone DEFAULT now() NOT NULL,
      "created_at"                  timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // creative_campaigns_platforms (hasMany select join table)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "creative_campaigns_platforms" (
      "_order"     integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "creative_campaigns"("id") ON DELETE CASCADE,
      "id"         varchar PRIMARY KEY,
      "value"      "public"."enum_creative_campaigns_platforms"
    );
  `);

  // brand_kits
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "brand_kits" (
      "id"                      serial PRIMARY KEY,
      "brand_name"              varchar NOT NULL,
      "slug"                    varchar NOT NULL UNIQUE,
      "client_id"               integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"      integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "status"                  "public"."enum_brand_kits_status" NOT NULL DEFAULT 'draft',
      "industry"                varchar,
      "audience"                text,
      "brand_personality"       text,
      "positioning_statement"   text,
      "tagline_options"         text,
      "primary_color"           varchar,
      "secondary_color"         varchar,
      "accent_color"            varchar,
      "neutral_color"           varchar,
      "typography_direction"    text,
      "logo_notes"              text,
      "voice_tone"              text,
      "brand_keywords"          text,
      "do_rules"                text,
      "dont_rules"              text,
      "social_bio"              text,
      "website_intro_copy"      text,
      "primary_c_t_a"           varchar,
      "secondary_c_t_a"         varchar,
      "canva_direction"         text,
      "internal_notes"          text,
      "next_action"             varchar,
      "next_action_due_date"    timestamp with time zone,
      "updated_at"              timestamp with time zone DEFAULT now() NOT NULL,
      "created_at"              timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // brand_kit_assets
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "brand_kit_assets" (
      "id"           serial PRIMARY KEY,
      "title"        varchar NOT NULL,
      "brand_kit_id" integer NOT NULL REFERENCES "brand_kits"("id") ON DELETE SET NULL,
      "client_id"    integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "asset_type"   "public"."enum_brand_kit_assets_asset_type",
      "status"       "public"."enum_brand_kit_assets_status" NOT NULL DEFAULT 'draft',
      "external_url" varchar,
      "notes"        text,
      "updated_at"   timestamp with time zone DEFAULT now() NOT NULL,
      "created_at"   timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // flyer_requests
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "flyer_requests" (
      "id"                          serial PRIMARY KEY,
      "flyer_title"                 varchar NOT NULL,
      "client_id"                   integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"          integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_campaign_id"         integer REFERENCES "creative_campaigns"("id") ON DELETE SET NULL,
      "flyer_type"                  "public"."enum_flyer_requests_flyer_type",
      "status"                      "public"."enum_flyer_requests_status" NOT NULL DEFAULT 'new',
      "priority"                    "public"."enum_flyer_requests_priority" NOT NULL DEFAULT 'normal',
      "size_format"                 "public"."enum_flyer_requests_size_format",
      "event_date"                  timestamp with time zone,
      "deadline"                    timestamp with time zone,
      "audience"                    varchar,
      "key_details"                 text,
      "offer_or_message"            text,
      "cta"                         varchar,
      "required_logos"              text,
      "required_images"             text,
      "canva_direction"             text,
      "generated_headline_options"  text,
      "generated_copy"              text,
      "internal_notes"              text,
      "next_action"                 varchar,
      "next_action_due_date"        timestamp with time zone,
      "updated_at"                  timestamp with time zone DEFAULT now() NOT NULL,
      "created_at"                  timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // promo_video_requests
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "promo_video_requests" (
      "id"                        serial PRIMARY KEY,
      "video_title"               varchar NOT NULL,
      "client_id"                 integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"        integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_campaign_id"       integer REFERENCES "creative_campaigns"("id") ON DELETE SET NULL,
      "video_type"                "public"."enum_promo_video_requests_video_type",
      "status"                    "public"."enum_promo_video_requests_status" NOT NULL DEFAULT 'new',
      "priority"                  "public"."enum_promo_video_requests_priority" NOT NULL DEFAULT 'normal',
      "platform"                  "public"."enum_promo_video_requests_platform",
      "aspect_ratio"              "public"."enum_promo_video_requests_aspect_ratio",
      "duration_target"           "public"."enum_promo_video_requests_duration_target",
      "visual_style"              "public"."enum_promo_video_requests_visual_style",
      "goal"                      text,
      "audience"                  varchar,
      "website_url"               varchar,
      "required_screenshots"      text,
      "required_clips"            text,
      "music_direction"           text,
      "shot_list"                 text,
      "generated_script"          text,
      "generated_captions"        text,
      "generated_on_screen_text"  text,
      "generated_post_copy"       text,
      "editing_notes"             text,
      "deadline"                  timestamp with time zone,
      "internal_notes"            text,
      "next_action"               varchar,
      "next_action_due_date"      timestamp with time zone,
      "updated_at"                timestamp with time zone DEFAULT now() NOT NULL,
      "created_at"                timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // social_post_requests
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "social_post_requests" (
      "id"                      serial PRIMARY KEY,
      "post_title"              varchar NOT NULL,
      "client_id"               integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"      integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_campaign_id"     integer REFERENCES "creative_campaigns"("id") ON DELETE SET NULL,
      "post_type"               "public"."enum_social_post_requests_post_type",
      "status"                  "public"."enum_social_post_requests_status" NOT NULL DEFAULT 'new',
      "priority"                "public"."enum_social_post_requests_priority" NOT NULL DEFAULT 'normal',
      "platform"                "public"."enum_social_post_requests_platform",
      "audience"                varchar,
      "key_message"             text,
      "cta"                     varchar,
      "image_direction"         text,
      "generated_caption"       text,
      "generated_short_caption" text,
      "generated_hashtags"      text,
      "scheduled_date"          timestamp with time zone,
      "published_url"           varchar,
      "internal_notes"          text,
      "next_action"             varchar,
      "next_action_due_date"    timestamp with time zone,
      "updated_at"              timestamp with time zone DEFAULT now() NOT NULL,
      "created_at"              timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // creative_assets
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "creative_assets" (
      "id"                serial PRIMARY KEY,
      "asset_title"       varchar NOT NULL,
      "client_id"         integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "related_project_id"  integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_campaign_id" integer REFERENCES "creative_campaigns"("id") ON DELETE SET NULL,
      "asset_type"        "public"."enum_creative_assets_asset_type",
      "status"            "public"."enum_creative_assets_status" NOT NULL DEFAULT 'raw',
      "external_url"      varchar,
      "notes"             text,
      "usage_rights"      varchar,
      "platform"          varchar,
      "created_for"       varchar,
      "deadline"          timestamp with time zone,
      "updated_at"        timestamp with time zone DEFAULT now() NOT NULL,
      "created_at"        timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // ── 3. Indexes ────────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "creative_campaigns_status_idx"          ON "creative_campaigns"("status");
    CREATE INDEX IF NOT EXISTS "creative_campaigns_client_idx"          ON "creative_campaigns"("client_id");
    CREATE INDEX IF NOT EXISTS "creative_campaigns_created_at_idx"      ON "creative_campaigns"("created_at");
    CREATE INDEX IF NOT EXISTS "creative_campaigns_platforms_parent_idx" ON "creative_campaigns_platforms"("_parent_id");
    CREATE INDEX IF NOT EXISTS "brand_kits_status_idx"                  ON "brand_kits"("status");
    CREATE INDEX IF NOT EXISTS "brand_kits_client_idx"                  ON "brand_kits"("client_id");
    CREATE INDEX IF NOT EXISTS "brand_kit_assets_brand_kit_idx"         ON "brand_kit_assets"("brand_kit_id");
    CREATE INDEX IF NOT EXISTS "flyer_requests_status_idx"              ON "flyer_requests"("status");
    CREATE INDEX IF NOT EXISTS "flyer_requests_client_idx"              ON "flyer_requests"("client_id");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_status_idx"        ON "promo_video_requests"("status");
    CREATE INDEX IF NOT EXISTS "promo_video_requests_client_idx"        ON "promo_video_requests"("client_id");
    CREATE INDEX IF NOT EXISTS "social_post_requests_status_idx"        ON "social_post_requests"("status");
    CREATE INDEX IF NOT EXISTS "social_post_requests_client_idx"        ON "social_post_requests"("client_id");
    CREATE INDEX IF NOT EXISTS "creative_assets_client_idx"             ON "creative_assets"("client_id");
    CREATE INDEX IF NOT EXISTS "creative_assets_status_idx"             ON "creative_assets"("status");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop tables in reverse dependency order
  await db.execute(sql`
    DROP TABLE IF EXISTS "creative_assets"            CASCADE;
    DROP TABLE IF EXISTS "social_post_requests"       CASCADE;
    DROP TABLE IF EXISTS "promo_video_requests"       CASCADE;
    DROP TABLE IF EXISTS "flyer_requests"             CASCADE;
    DROP TABLE IF EXISTS "brand_kit_assets"           CASCADE;
    DROP TABLE IF EXISTS "brand_kits"                 CASCADE;
    DROP TABLE IF EXISTS "creative_campaigns_platforms" CASCADE;
    DROP TABLE IF EXISTS "creative_campaigns"         CASCADE;
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_creative_assets_status"                 CASCADE;
    DROP TYPE IF EXISTS "public"."enum_creative_assets_asset_type"             CASCADE;
    DROP TYPE IF EXISTS "public"."enum_social_post_requests_platform"          CASCADE;
    DROP TYPE IF EXISTS "public"."enum_social_post_requests_priority"          CASCADE;
    DROP TYPE IF EXISTS "public"."enum_social_post_requests_status"            CASCADE;
    DROP TYPE IF EXISTS "public"."enum_social_post_requests_post_type"         CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_visual_style"      CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_duration_target"   CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_aspect_ratio"      CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_platform"          CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_priority"          CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_status"            CASCADE;
    DROP TYPE IF EXISTS "public"."enum_promo_video_requests_video_type"        CASCADE;
    DROP TYPE IF EXISTS "public"."enum_flyer_requests_size_format"             CASCADE;
    DROP TYPE IF EXISTS "public"."enum_flyer_requests_priority"                CASCADE;
    DROP TYPE IF EXISTS "public"."enum_flyer_requests_status"                  CASCADE;
    DROP TYPE IF EXISTS "public"."enum_flyer_requests_flyer_type"              CASCADE;
    DROP TYPE IF EXISTS "public"."enum_brand_kit_assets_status"                CASCADE;
    DROP TYPE IF EXISTS "public"."enum_brand_kit_assets_asset_type"            CASCADE;
    DROP TYPE IF EXISTS "public"."enum_brand_kits_status"                      CASCADE;
    DROP TYPE IF EXISTS "public"."enum_creative_campaigns_platforms"           CASCADE;
    DROP TYPE IF EXISTS "public"."enum_creative_campaigns_priority"            CASCADE;
    DROP TYPE IF EXISTS "public"."enum_creative_campaigns_status"              CASCADE;
    DROP TYPE IF EXISTS "public"."enum_creative_campaigns_campaign_type"       CASCADE;
  `);
}
