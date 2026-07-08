/**
 * Phase 18G — Client review media storage metadata.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_review_media"
      ADD COLUMN IF NOT EXISTS "storage_provider" varchar DEFAULT 'local',
      ADD COLUMN IF NOT EXISTS "storage_key" varchar;
  `);

  await db.execute(sql`
    UPDATE "client_review_media"
      SET "storage_key" = "filename",
          "storage_provider" = 'local'
      WHERE "storage_key" IS NULL
        AND "filename" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_review_media"
      DROP COLUMN IF EXISTS "storage_provider",
      DROP COLUMN IF EXISTS "storage_key";
  `);
}
