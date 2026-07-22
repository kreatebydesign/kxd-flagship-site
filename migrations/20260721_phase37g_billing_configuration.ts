/**
 * Phase 37G — Billing configuration foundation fields on billing-profiles.
 *
 * Additive only:
 * - currency_code, collection_method, tax_posture
 * - NULL by default — does not invent financial intent for existing clients
 * - Does not create billing profiles
 * - Does not touch Stripe, agreements, plans, or entitlements
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_currency_code'
      ) THEN
        CREATE TYPE "public"."enum_billing_profiles_currency_code" AS ENUM('usd');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_collection_method'
      ) THEN
        CREATE TYPE "public"."enum_billing_profiles_collection_method" AS ENUM(
          'send_invoice',
          'charge_automatically'
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_billing_profiles_tax_posture'
      ) THEN
        CREATE TYPE "public"."enum_billing_profiles_tax_posture" AS ENUM(
          'not_configured',
          'tax_exempt',
          'taxable',
          'requires_review'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "billing_profiles"
      ADD COLUMN IF NOT EXISTS "currency_code" "public"."enum_billing_profiles_currency_code",
      ADD COLUMN IF NOT EXISTS "collection_method" "public"."enum_billing_profiles_collection_method",
      ADD COLUMN IF NOT EXISTS "tax_posture" "public"."enum_billing_profiles_tax_posture";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "billing_profiles"
      DROP COLUMN IF EXISTS "currency_code",
      DROP COLUMN IF EXISTS "collection_method",
      DROP COLUMN IF EXISTS "tax_posture";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_billing_profiles_currency_code";
    DROP TYPE IF EXISTS "public"."enum_billing_profiles_collection_method";
    DROP TYPE IF EXISTS "public"."enum_billing_profiles_tax_posture";
  `);
}
