/**
 * Junior Creator shift corrections — manual pay adjustments + immutable audit.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "junior_creator_shifts"
      ADD COLUMN IF NOT EXISTS "pay_adjustment_cents" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "correction_audit" jsonb;
  `);

  await db.execute(sql`
    UPDATE "junior_creator_shifts"
    SET "pay_adjustment_cents" = 0
    WHERE "pay_adjustment_cents" IS NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "junior_creator_shifts"
      DROP COLUMN IF EXISTS "correction_audit",
      DROP COLUMN IF EXISTS "pay_adjustment_cents";
  `);
}
