/**
 * Monthly deliverables — optional client-facing notes separate from internal operator notes.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "monthly_deliverables"
      ADD COLUMN IF NOT EXISTS "client_notes" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "monthly_deliverables"
      DROP COLUMN IF EXISTS "client_notes";
  `);
}
