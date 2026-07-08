/**
 * KXD Core Phase 12A — Client Experience System
 * client_experience_profiles
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_experience_profiles_status') THEN
        CREATE TYPE "public"."enum_client_experience_profiles_status"
          AS ENUM('draft', 'active', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_experience_profiles_border_radius_preset') THEN
        CREATE TYPE "public"."enum_client_experience_profiles_border_radius_preset"
          AS ENUM('soft', 'default', 'sharp');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_experience_profiles_motion_preset') THEN
        CREATE TYPE "public"."enum_client_experience_profiles_motion_preset"
          AS ENUM('calm', 'default', 'reduced');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_experience_profiles_support_tone') THEN
        CREATE TYPE "public"."enum_client_experience_profiles_support_tone"
          AS ENUM('warm-professional', 'direct', 'formal');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_experience_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "profile_name" varchar NOT NULL,
      "client_id" integer NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE CASCADE,
      "status" "public"."enum_client_experience_profiles_status" DEFAULT 'draft' NOT NULL,
      "brand_kit_id" integer REFERENCES "brand_kits"("id") ON DELETE SET NULL,
      "logo_override_id" integer REFERENCES "media"("id") ON DELETE SET NULL,
      "primary_color" varchar,
      "secondary_color" varchar,
      "accent_color" varchar,
      "surface_tint" varchar,
      "border_radius_preset" "public"."enum_client_experience_profiles_border_radius_preset" DEFAULT 'default',
      "motion_preset" "public"."enum_client_experience_profiles_motion_preset" DEFAULT 'calm',
      "welcome_eyebrow" varchar,
      "reassurance_line" varchar,
      "support_tone" "public"."enum_client_experience_profiles_support_tone" DEFAULT 'warm-professional',
      "portal_sidebar_label" varchar,
      "enabled_modules" jsonb,
      "terminology" jsonb,
      "show_kxd_partner_mark" boolean DEFAULT true,
      "partner_footer_line" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_experience_profiles_client_idx"
      ON "client_experience_profiles" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_experience_profiles_status_idx"
      ON "client_experience_profiles" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_experience_profiles_brand_kit_idx"
      ON "client_experience_profiles" USING btree ("brand_kit_id");
    CREATE INDEX IF NOT EXISTS "client_experience_profiles_updated_at_idx"
      ON "client_experience_profiles" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "client_experience_profiles_created_at_idx"
      ON "client_experience_profiles" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "client_experience_profiles" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_experience_profiles_support_tone";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_experience_profiles_motion_preset";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_experience_profiles_border_radius_preset";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_experience_profiles_status";`);
}
