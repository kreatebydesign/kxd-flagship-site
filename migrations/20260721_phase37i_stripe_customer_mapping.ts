/**
 * Phase 37I — Additive Stripe customer mapping fields on billing-profiles.
 *
 * - stripe_mode, stripe_account_id, mapping status, verified/reconciled timestamps
 * - NULL by default — does not invent mappings or create profiles
 * - Partial unique index on (stripe_customer_id, stripe_mode) when customer id present
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_stripe_mode'
      ) THEN
        CREATE TYPE "public"."enum_billing_profiles_stripe_mode" AS ENUM('test', 'live');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_stripe_customer_mapping_status'
      ) THEN
        CREATE TYPE "public"."enum_billing_profiles_stripe_customer_mapping_status" AS ENUM(
          'unlinked',
          'linked',
          'requires_review'
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_stripe_customer_reconciliation_status'
      ) THEN
        CREATE TYPE "public"."enum_billing_profiles_stripe_customer_reconciliation_status" AS ENUM(
          'unlinked',
          'linked_healthy',
          'customer_missing',
          'customer_deleted',
          'account_mismatch',
          'mode_mismatch',
          'client_metadata_missing',
          'client_metadata_mismatch',
          'duplicate_internal_mapping',
          'conflicting_billing_profiles',
          'configuration_blocked',
          'connectivity_failed',
          'requires_operator_review'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "billing_profiles"
      ADD COLUMN IF NOT EXISTS "stripe_mode" "public"."enum_billing_profiles_stripe_mode",
      ADD COLUMN IF NOT EXISTS "stripe_account_id" varchar,
      ADD COLUMN IF NOT EXISTS "stripe_customer_mapping_status" "public"."enum_billing_profiles_stripe_customer_mapping_status",
      ADD COLUMN IF NOT EXISTS "stripe_customer_verified_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "stripe_customer_last_reconciled_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "stripe_customer_reconciliation_status" "public"."enum_billing_profiles_stripe_customer_reconciliation_status";
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "billing_profiles_stripe_customer_mode_unique"
      ON "billing_profiles" ("stripe_customer_id", "stripe_mode")
      WHERE "stripe_customer_id" IS NOT NULL AND "stripe_mode" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "billing_profiles_stripe_customer_mode_unique";
  `);

  await db.execute(sql`
    ALTER TABLE "billing_profiles"
      DROP COLUMN IF EXISTS "stripe_mode",
      DROP COLUMN IF EXISTS "stripe_account_id",
      DROP COLUMN IF EXISTS "stripe_customer_mapping_status",
      DROP COLUMN IF EXISTS "stripe_customer_verified_at",
      DROP COLUMN IF EXISTS "stripe_customer_last_reconciled_at",
      DROP COLUMN IF EXISTS "stripe_customer_reconciliation_status";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_billing_profiles_stripe_mode";
    DROP TYPE IF EXISTS "public"."enum_billing_profiles_stripe_customer_mapping_status";
    DROP TYPE IF EXISTS "public"."enum_billing_profiles_stripe_customer_reconciliation_status";
  `);
}
