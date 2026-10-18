/**
 * Work Management R1 — optional acceptance criteria on work items.
 * Additive only. Nullable column; no backfill required.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "work"
      ADD COLUMN IF NOT EXISTS "acceptance_criteria" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "work"
      DROP COLUMN IF EXISTS "acceptance_criteria";
  `);
}
