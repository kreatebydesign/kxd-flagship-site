/**
 * Phase 20G — operationsFrame JSON on training lessons
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "training_lessons"
      ADD COLUMN IF NOT EXISTS "operations_frame" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "training_lessons"
      DROP COLUMN IF EXISTS "operations_frame";
  `);
}
