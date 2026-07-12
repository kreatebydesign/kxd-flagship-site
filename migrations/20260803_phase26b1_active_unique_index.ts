/**
 * Phase 26B.1 follow-up — extend one-active unique index to include
 * pending_calendar_write (enum value committed by prior migration).
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "work_schedule_links_one_active_per_work";
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX "work_schedule_links_one_active_per_work"
      ON "work_schedule_links" ("work_id")
      WHERE status IN (
        'draft',
        'proposed',
        'approval_required',
        'approved',
        'pending_calendar_write',
        'reschedule_required',
        'scheduled',
        'sync_error'
      );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "work_schedule_links_one_active_per_work";
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "work_schedule_links_one_active_per_work"
      ON "work_schedule_links" ("work_id")
      WHERE status IN (
        'draft',
        'proposed',
        'approval_required',
        'approved',
        'reschedule_required',
        'scheduled',
        'sync_error'
      );
  `);
}
