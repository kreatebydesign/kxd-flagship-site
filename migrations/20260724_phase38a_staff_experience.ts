/**
 * Phase 38A — Internal staff experience fields on users.
 * Additive only. Does not invent staff users or change existing roles.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_users_staff_role'
      ) THEN
        CREATE TYPE "public"."enum_users_staff_role" AS ENUM(
          'none',
          'operations_coordinator',
          'executive_operations_coordinator',
          'operations_manager'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "staff_role" "public"."enum_users_staff_role" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "staff_onboarding_completed_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      DROP COLUMN IF EXISTS "staff_onboarding_completed_at",
      DROP COLUMN IF EXISTS "staff_role";
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_users_staff_role'
      ) THEN
        DROP TYPE "public"."enum_users_staff_role";
      END IF;
    END $$;
  `);
}
