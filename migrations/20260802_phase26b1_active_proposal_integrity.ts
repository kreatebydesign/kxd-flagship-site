/**
 * Phase 26B.1 — Active proposal integrity + lifecycle correction
 *
 * - Adds pending_calendar_write + superseded link statuses
 * - Adds approved + pending_calendar_write Work projection statuses
 * - Adds supersededReason / replacedBy columns
 * - Cancels duplicate actives (safe pre-index cleanup)
 * - Partial unique index for one active proposal per Work
 *   (pending_calendar_write added in follow-up migration after enum commit)
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      BEGIN
        ALTER TYPE "public"."enum_work_schedule_links_status" ADD VALUE 'pending_calendar_write';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_work_schedule_links_status" ADD VALUE 'superseded';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_work_scheduling_status" ADD VALUE 'approved';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_work_scheduling_status" ADD VALUE 'pending_calendar_write';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "work_schedule_links"
      ADD COLUMN IF NOT EXISTS "superseded_reason" varchar,
      ADD COLUMN IF NOT EXISTS "replaced_by_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_schedule_links_replaced_by_id_fk'
      ) THEN
        ALTER TABLE "work_schedule_links"
          ADD CONSTRAINT "work_schedule_links_replaced_by_id_fk"
          FOREIGN KEY ("replaced_by_id")
          REFERENCES "public"."work_schedule_links"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "work_schedule_links_replaced_by_idx"
      ON "work_schedule_links" USING btree ("replaced_by_id");
  `);

  // Collapse duplicate actives using existing `canceled` (safe in this transaction).
  await db.execute(sql`
    WITH ranked AS (
      SELECT
        id,
        work_id,
        ROW_NUMBER() OVER (
          PARTITION BY work_id
          ORDER BY
            CASE status
              WHEN 'approved' THEN 1
              WHEN 'scheduled' THEN 2
              WHEN 'sync_error' THEN 3
              WHEN 'approval_required' THEN 4
              WHEN 'proposed' THEN 5
              WHEN 'reschedule_required' THEN 6
              WHEN 'draft' THEN 7
              ELSE 8
            END,
            updated_at DESC NULLS LAST,
            id DESC
        ) AS rn
      FROM "work_schedule_links"
      WHERE status NOT IN ('rejected', 'canceled', 'completed')
    )
    UPDATE "work_schedule_links" AS w
    SET
      status = 'canceled',
      canceled_reason = 'Replaced during active proposal integrity cleanup',
      updated_at = NOW()
    FROM ranked AS r
    WHERE w.id = r.id AND r.rn > 1;
  `);

  await db.execute(sql`
    WITH survivors AS (
      SELECT DISTINCT ON (work_id)
        work_id,
        id AS link_id,
        proposed_start,
        proposed_end,
        status AS link_status
      FROM "work_schedule_links"
      WHERE status NOT IN ('rejected', 'canceled', 'completed')
      ORDER BY
        work_id,
        CASE status
          WHEN 'approved' THEN 1
          WHEN 'scheduled' THEN 2
          WHEN 'sync_error' THEN 3
          WHEN 'approval_required' THEN 4
          WHEN 'proposed' THEN 5
          WHEN 'reschedule_required' THEN 6
          WHEN 'draft' THEN 7
          ELSE 8
        END,
        updated_at DESC NULLS LAST,
        id DESC
    )
    UPDATE "work" AS w
    SET
      active_schedule_link_id = s.link_id,
      scheduled_start = s.proposed_start,
      scheduled_end = s.proposed_end,
      scheduling_status = CASE
        WHEN s.link_status = 'scheduled' THEN 'scheduled'::"public"."enum_work_scheduling_status"
        WHEN s.link_status = 'sync_error' THEN 'sync_error'::"public"."enum_work_scheduling_status"
        ELSE 'proposed'::"public"."enum_work_scheduling_status"
      END
    FROM survivors AS s
    WHERE w.id = s.work_id;
  `);

  // Partial unique index using only pre-existing enum labels (immutable predicate).
  // pending_calendar_write is added in 20260803 after this enum commit.
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

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "work_schedule_links_one_active_per_work";
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "work_schedule_links_replaced_by_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "work_schedule_links"
      DROP CONSTRAINT IF EXISTS "work_schedule_links_replaced_by_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "work_schedule_links"
      DROP COLUMN IF EXISTS "replaced_by_id",
      DROP COLUMN IF EXISTS "superseded_reason";
  `);
}
