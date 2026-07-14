/**
 * Phase 32B — Google Ads customer ID fields on client infrastructure.
 * Additive only. No credential storage. No entitlement column.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      ADD COLUMN IF NOT EXISTS "google_ads_customer_id" varchar,
      ADD COLUMN IF NOT EXISTS "google_ads_login_customer_id" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      DROP COLUMN IF EXISTS "google_ads_customer_id",
      DROP COLUMN IF EXISTS "google_ads_login_customer_id";
  `);
}
