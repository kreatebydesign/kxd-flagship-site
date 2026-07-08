/**
 * Phase 12H — Portal welcome onboarding persistence on portal-users.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "portal_users"
      ADD COLUMN IF NOT EXISTS "welcome_completed_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "portal_users"
      DROP COLUMN IF EXISTS "welcome_completed_at";
  `);
}
