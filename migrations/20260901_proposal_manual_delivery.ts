/**
 * Additive: optional manual delivery evidence on proposals.
 *
 * Safety: ADD COLUMN IF NOT EXISTS only. No backfill. No live-row rewrite.
 * Do not execute against production until separately authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "proposals"
      ADD COLUMN IF NOT EXISTS "manual_delivery" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "proposals"
      DROP COLUMN IF EXISTS "manual_delivery";
  `);
}
