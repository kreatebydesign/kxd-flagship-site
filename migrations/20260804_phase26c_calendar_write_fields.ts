/**
 * Phase 26C — calendarWriteAt + lastSyncAt on work_schedule_links.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "work_schedule_links"
      ADD COLUMN IF NOT EXISTS "calendar_write_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "work_schedule_links"
      DROP COLUMN IF EXISTS "last_sync_at",
      DROP COLUMN IF EXISTS "calendar_write_at";
  `);
}
