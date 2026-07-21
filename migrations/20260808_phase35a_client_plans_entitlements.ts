/**
 * Phase 35A — Client Plans & Entitlements columns on clients.
 *
 * Backward compatibility:
 * - Existing clients keep plan_key NULL and plan_status = 'legacy'
 * - Resolver treats legacy/unassigned as "use CES enabledModules"
 * - enabledModules on experience profiles is NOT deleted or modified by this migration
 * - Runtime note: paused plans deny portal access via the resolver; they must not
 *   wipe CES enabledModules (see shouldSyncCesEnabledModules).
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_clients_plan_key'
      ) THEN
        CREATE TYPE "public"."enum_clients_plan_key" AS ENUM(
          'starter', 'growth', 'premium', 'enterprise', 'custom'
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_clients_plan_status'
      ) THEN
        CREATE TYPE "public"."enum_clients_plan_status" AS ENUM(
          'active', 'trial', 'paused', 'legacy'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "plan_key" "public"."enum_clients_plan_key",
      ADD COLUMN IF NOT EXISTS "plan_status" "public"."enum_clients_plan_status" DEFAULT 'legacy',
      ADD COLUMN IF NOT EXISTS "plan_effective_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "plan_note" varchar,
      ADD COLUMN IF NOT EXISTS "plan_add_on_modules" jsonb,
      ADD COLUMN IF NOT EXISTS "plan_removed_modules" jsonb;
  `);

  await db.execute(sql`
    UPDATE "clients"
    SET "plan_status" = 'legacy'
    WHERE "plan_status" IS NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients"
      DROP COLUMN IF EXISTS "plan_key",
      DROP COLUMN IF EXISTS "plan_status",
      DROP COLUMN IF EXISTS "plan_effective_at",
      DROP COLUMN IF EXISTS "plan_note",
      DROP COLUMN IF EXISTS "plan_add_on_modules",
      DROP COLUMN IF EXISTS "plan_removed_modules";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_clients_plan_key";
    DROP TYPE IF EXISTS "public"."enum_clients_plan_status";
  `);
}
