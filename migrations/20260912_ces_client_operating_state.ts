/**
 * CES — additive Client Operating State JSON on experience profiles.
 * Business/operating intent only. Safe null default for existing clients.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_experience_profiles"
      ADD COLUMN IF NOT EXISTS "operating_state" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_experience_profiles"
      DROP COLUMN IF EXISTS "operating_state";
  `);
}
