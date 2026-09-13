/**
 * KXD website acquisition persistence.
 *
 * Additive nullable fields only:
 * - inquiries.acquisition
 * - project_inquiries.acquisition
 * - project_inquiries.referral_source
 *
 * No backfill: historical records remain honestly uncaptured.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "inquiries"
      ADD COLUMN IF NOT EXISTS "acquisition" jsonb;

    ALTER TABLE "project_inquiries"
      ADD COLUMN IF NOT EXISTS "acquisition" jsonb,
      ADD COLUMN IF NOT EXISTS "referral_source" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "project_inquiries"
      DROP COLUMN IF EXISTS "referral_source",
      DROP COLUMN IF EXISTS "acquisition";

    ALTER TABLE "inquiries"
      DROP COLUMN IF EXISTS "acquisition";
  `);
}
