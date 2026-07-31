import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/**
 * Additive lifecycle package for dual e-sign + billing prep on contracts.
 * Does not alter Proposal ID 1 or existing builder fields.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contracts"
    ADD COLUMN IF NOT EXISTS "lifecycle_package" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contracts"
    DROP COLUMN IF EXISTS "lifecycle_package";
  `);
}
