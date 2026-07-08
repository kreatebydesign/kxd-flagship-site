/**
 * Phase 13A — Portal user active state for admin-managed access control.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "portal_users"
      ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "portal_users"
      DROP COLUMN IF EXISTS "active";
  `);
}
