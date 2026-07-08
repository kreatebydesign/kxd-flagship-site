/**
 * Fix CES enabled_modules — Payload json field (not pg enum array)
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_experience_profiles"
      ALTER COLUMN "enabled_modules" TYPE jsonb
      USING to_jsonb("enabled_modules");
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_experience_profiles_enabled_modules";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_experience_profiles_enabled_modules') THEN
        CREATE TYPE "public"."enum_client_experience_profiles_enabled_modules"
          AS ENUM('website-review');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_experience_profiles"
      ALTER COLUMN "enabled_modules" TYPE "public"."enum_client_experience_profiles_enabled_modules"[]
      USING CASE
        WHEN "enabled_modules" IS NULL THEN NULL
        ELSE ARRAY(SELECT jsonb_array_elements_text("enabled_modules"))::"public"."enum_client_experience_profiles_enabled_modules"[]
      END;
  `);
}
