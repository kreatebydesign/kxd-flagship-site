/**
 * Staff Sales — explicit staff recording attribution on sales-activities.
 * Operator activities leave recorded_by_staff_user_id NULL (hidden from staff projections).
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sales_activities"
      ADD COLUMN IF NOT EXISTS "recorded_by_staff_user_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_activities_recorded_by_staff_user_id_fk'
      ) THEN
        ALTER TABLE "sales_activities"
          ADD CONSTRAINT "sales_activities_recorded_by_staff_user_id_fk"
          FOREIGN KEY ("recorded_by_staff_user_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sales_activities_recorded_by_staff_user_idx"
      ON "sales_activities" ("recorded_by_staff_user_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "sales_activities_recorded_by_staff_user_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "sales_activities"
      DROP CONSTRAINT IF EXISTS "sales_activities_recorded_by_staff_user_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "sales_activities"
      DROP COLUMN IF EXISTS "recorded_by_staff_user_id";
  `);
}
