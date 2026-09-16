/**
 * Mission 01: media_vault capability enum value + drives_experience flag.
 *
 * Additive only. Does not mutate commercial amounts, obligations, or payments.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_service_assignments_capability_id'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_client_service_assignments_capability_id'
          AND e.enumlabel = 'media_vault'
      ) THEN
        ALTER TYPE "public"."enum_client_service_assignments_capability_id"
          ADD VALUE 'media_vault';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_service_assignments"
      ADD COLUMN IF NOT EXISTS "drives_experience" boolean DEFAULT true;
  `);

  await db.execute(sql`
    UPDATE "client_service_assignments"
    SET "drives_experience" = true
    WHERE "drives_experience" IS NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot safely remove enum values. Drop only the additive column.
  await db.execute(sql`
    ALTER TABLE "client_service_assignments"
      DROP COLUMN IF EXISTS "drives_experience";
  `);
}
