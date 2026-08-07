/**
 * Junior Creator timer safety — activity heartbeat + auto-stop audit fields.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "junior_creator_shifts"
      ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "stop_reason" varchar,
      ADD COLUMN IF NOT EXISTS "automatic_stop_at" timestamp(3) with time zone;
  `);

  // Backfill last_activity_at for existing active/completed rows so failsafe has a baseline.
  await db.execute(sql`
    UPDATE "junior_creator_shifts"
    SET "last_activity_at" = COALESCE("ended_at", "started_at")
    WHERE "last_activity_at" IS NULL;
  `);

  await db.execute(sql`
    UPDATE "junior_creator_shifts"
    SET "stop_reason" = 'manual'
    WHERE "status" = 'completed' AND "stop_reason" IS NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "junior_creator_shifts"
      DROP COLUMN IF EXISTS "automatic_stop_at",
      DROP COLUMN IF EXISTS "stop_reason",
      DROP COLUMN IF EXISTS "last_activity_at";
  `);
}
