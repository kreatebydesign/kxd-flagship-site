/**
 * Phase 24A — Work Planning: plannedForDate column.
 * Daily execution plan date — independent of due_date / start_date.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "work"
      ADD COLUMN IF NOT EXISTS "planned_for_date" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "work_planned_for_date_idx"
      ON "work" USING btree ("planned_for_date");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "work_planned_for_date_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      DROP COLUMN IF EXISTS "planned_for_date";
  `);
}
