/**
 * Phase 29C — Add Search Console site URL on client infrastructure.
 * Additive only. No credential storage. No capability entitlement column —
 * capabilities resolve from Client Experience Profiles enabledModules.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      ADD COLUMN IF NOT EXISTS "search_console_site_url" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      DROP COLUMN IF EXISTS "search_console_site_url";
  `);
}
