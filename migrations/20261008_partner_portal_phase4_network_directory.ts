/**
 * Partner Portal Phase 4 — Network member directory + selected work showcase.
 * Additive only. Local apply until production migration is authorized.
 * Does not mutate existing partner identity, invitations, commissions, or CES.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_kxd_partner_profiles_directory_visibility'
      ) THEN
        CREATE TYPE "public"."enum_kxd_partner_profiles_directory_visibility" AS ENUM(
          'private', 'published'
        );
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_kxd_network_showcase_directory_visibility'
      ) THEN
        CREATE TYPE "public"."enum_kxd_network_showcase_directory_visibility" AS ENUM(
          'private', 'published'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "kxd_partner_profiles"
      ADD COLUMN IF NOT EXISTS "directory_visibility"
        "public"."enum_kxd_partner_profiles_directory_visibility" DEFAULT 'private',
      ADD COLUMN IF NOT EXISTS "city_market" varchar,
      ADD COLUMN IF NOT EXISTS "company_or_role" varchar,
      ADD COLUMN IF NOT EXISTS "connection_lane1" varchar,
      ADD COLUMN IF NOT EXISTS "connection_lane2" varchar,
      ADD COLUMN IF NOT EXISTS "connection_lane3" varchar,
      ADD COLUMN IF NOT EXISTS "profile_line" varchar,
      ADD COLUMN IF NOT EXISTS "directory_mark_id" integer,
      ADD COLUMN IF NOT EXISTS "trusted_partner" boolean DEFAULT false;
  `);

  await db.execute(sql`
    UPDATE "kxd_partner_profiles"
    SET "directory_visibility" = 'private'
    WHERE "directory_visibility" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "kxd_partner_profiles"
      ALTER COLUMN "directory_visibility" SET DEFAULT 'private',
      ALTER COLUMN "directory_visibility" SET NOT NULL;
  `);

  await db.execute(sql`
    UPDATE "kxd_partner_profiles"
    SET "trusted_partner" = false
    WHERE "trusted_partner" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "kxd_partner_profiles"
      ALTER COLUMN "trusted_partner" SET DEFAULT false,
      ALTER COLUMN "trusted_partner" SET NOT NULL;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'kxd_partner_profiles_directory_mark_id_media_id_fk'
      ) THEN
        ALTER TABLE "kxd_partner_profiles"
          ADD CONSTRAINT "kxd_partner_profiles_directory_mark_id_media_id_fk"
          FOREIGN KEY ("directory_mark_id") REFERENCES "media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "kxd_partner_profiles_directory_visibility_idx"
      ON "kxd_partner_profiles" ("directory_visibility");
    CREATE INDEX IF NOT EXISTS "kxd_partner_profiles_directory_mark_idx"
      ON "kxd_partner_profiles" ("directory_mark_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "kxd_network_showcase" (
      "id" serial PRIMARY KEY NOT NULL,
      "directory_visibility" "public"."enum_kxd_network_showcase_directory_visibility"
        DEFAULT 'private' NOT NULL,
      "company_name" varchar NOT NULL,
      "category_market" varchar,
      "work_description" varchar,
      "mark_id" integer,
      "website_url" varchar,
      "credited_partner_id" integer,
      "credit_attribution" boolean DEFAULT false NOT NULL,
      "owner_approved_for_network" boolean DEFAULT false NOT NULL,
      "sort_order" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'kxd_network_showcase_mark_id_media_id_fk'
      ) THEN
        ALTER TABLE "kxd_network_showcase"
          ADD CONSTRAINT "kxd_network_showcase_mark_id_media_id_fk"
          FOREIGN KEY ("mark_id") REFERENCES "media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'kxd_network_showcase_credited_partner_id_kxd_partner_profiles_id_fk'
      ) THEN
        ALTER TABLE "kxd_network_showcase"
          ADD CONSTRAINT "kxd_network_showcase_credited_partner_id_kxd_partner_profiles_id_fk"
          FOREIGN KEY ("credited_partner_id") REFERENCES "kxd_partner_profiles"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "kxd_network_showcase_directory_visibility_idx"
      ON "kxd_network_showcase" ("directory_visibility");
    CREATE INDEX IF NOT EXISTS "kxd_network_showcase_owner_approved_idx"
      ON "kxd_network_showcase" ("owner_approved_for_network");
    CREATE INDEX IF NOT EXISTS "kxd_network_showcase_mark_idx"
      ON "kxd_network_showcase" ("mark_id");
    CREATE INDEX IF NOT EXISTS "kxd_network_showcase_credited_partner_idx"
      ON "kxd_network_showcase" ("credited_partner_id");
    CREATE INDEX IF NOT EXISTS "kxd_network_showcase_sort_order_idx"
      ON "kxd_network_showcase" ("sort_order");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "kxd_network_showcase";
  `);
  await db.execute(sql`
    ALTER TABLE "kxd_partner_profiles"
      DROP CONSTRAINT IF EXISTS "kxd_partner_profiles_directory_mark_id_media_id_fk";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "kxd_partner_profiles_directory_visibility_idx";
    DROP INDEX IF EXISTS "kxd_partner_profiles_directory_mark_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "kxd_partner_profiles"
      DROP COLUMN IF EXISTS "directory_visibility",
      DROP COLUMN IF EXISTS "city_market",
      DROP COLUMN IF EXISTS "company_or_role",
      DROP COLUMN IF EXISTS "connection_lane1",
      DROP COLUMN IF EXISTS "connection_lane2",
      DROP COLUMN IF EXISTS "connection_lane3",
      DROP COLUMN IF EXISTS "profile_line",
      DROP COLUMN IF EXISTS "directory_mark_id",
      DROP COLUMN IF EXISTS "trusted_partner";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_kxd_network_showcase_directory_visibility";
    DROP TYPE IF EXISTS "public"."enum_kxd_partner_profiles_directory_visibility";
  `);
}
