/**
 * Phase 36A — Commercial agreement fields on clients + inquiries.
 *
 * Additive only:
 * - Existing clients keep commercial fields NULL (treated as legacy/unset)
 * - Does not modify planKey, planStatus, CES enabledModules, or entitlements
 * - Does not invent commercial agreements for historical accounts
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_clients_commercial_agreement_id'
      ) THEN
        CREATE TYPE "public"."enum_clients_commercial_agreement_id" AS ENUM(
          'kxd-partnership',
          'kxd-operating',
          'kxd-executive',
          'custom-legacy'
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_inquiries_partnership_package'
      ) THEN
        CREATE TYPE "public"."enum_inquiries_partnership_package" AS ENUM(
          'partnership',
          'operating',
          'executive'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "commercial_agreement_id" "public"."enum_clients_commercial_agreement_id",
      ADD COLUMN IF NOT EXISTS "setup_fee" numeric,
      ADD COLUMN IF NOT EXISTS "monthly_service_credits" numeric,
      ADD COLUMN IF NOT EXISTS "commercial_add_ons" jsonb,
      ADD COLUMN IF NOT EXISTS "commercial_notes" varchar;
  `);

  await db.execute(sql`
    ALTER TABLE "inquiries"
      ADD COLUMN IF NOT EXISTS "website" varchar,
      ADD COLUMN IF NOT EXISTS "partnership_package" "public"."enum_inquiries_partnership_package";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients"
      DROP COLUMN IF EXISTS "commercial_agreement_id",
      DROP COLUMN IF EXISTS "setup_fee",
      DROP COLUMN IF EXISTS "monthly_service_credits",
      DROP COLUMN IF EXISTS "commercial_add_ons",
      DROP COLUMN IF EXISTS "commercial_notes";
  `);

  await db.execute(sql`
    ALTER TABLE "inquiries"
      DROP COLUMN IF EXISTS "website",
      DROP COLUMN IF EXISTS "partnership_package";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_clients_commercial_agreement_id";
    DROP TYPE IF EXISTS "public"."enum_inquiries_partnership_package";
  `);
}
