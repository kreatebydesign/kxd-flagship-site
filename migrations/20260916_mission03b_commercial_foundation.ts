/**
 * Mission 003B — Commercial Truth foundation schema (additive only).
 * Clients classification + ClientInfrastructure hosting renewal/auto-charge
 * readiness + SalesActivities commercial memory activity types.
 *
 * Does NOT invent amounts, payments, or auto-enroll clients.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "commercial_categories" jsonb,
      ADD COLUMN IF NOT EXISTS "pricing_classification" varchar,
      ADD COLUMN IF NOT EXISTS "commercial_review_reason" varchar;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_clients_pricing_classification'
      ) THEN
        CREATE TYPE "public"."enum_clients_pricing_classification" AS ENUM (
          'standard', 'custom', 'legacy', 'grandfathered', 'friends_family'
        );
      END IF;
    END $$;
  `);

  // Best-effort cast when column is plain varchar from ADD COLUMN above.
  await db.execute(sql`
    DO $$ BEGIN
      BEGIN
        ALTER TABLE "clients"
          ALTER COLUMN "pricing_classification"
          TYPE "public"."enum_clients_pricing_classification"
          USING (
            CASE
              WHEN "pricing_classification" IN ('standard','custom','legacy','grandfathered','friends_family')
                THEN "pricing_classification"::"public"."enum_clients_pricing_classification"
              ELSE NULL
            END
          );
      EXCEPTION WHEN others THEN
        NULL;
      END;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      ADD COLUMN IF NOT EXISTS "hosting_annual_amount_cents" numeric,
      ADD COLUMN IF NOT EXISTS "hosting_service_start_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "hosting_billing_due_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "hosting_auto_charge_mode" varchar DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS "hosting_renewal_lifecycle" varchar DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS "renewal_notice_sent_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_sales_activities_activity_type'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_sales_activities_activity_type'
            AND e.enumlabel = 'commercial-trigger'
        ) THEN
          ALTER TYPE "public"."enum_sales_activities_activity_type" ADD VALUE 'commercial-trigger';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_sales_activities_activity_type'
            AND e.enumlabel = 'payment-promised'
        ) THEN
          ALTER TYPE "public"."enum_sales_activities_activity_type" ADD VALUE 'payment-promised';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_sales_activities_activity_type'
            AND e.enumlabel = 'renewal-notice'
        ) THEN
          ALTER TYPE "public"."enum_sales_activities_activity_type" ADD VALUE 'renewal-notice';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_sales_activities_activity_type'
            AND e.enumlabel = 'commission-follow-up'
        ) THEN
          ALTER TYPE "public"."enum_sales_activities_activity_type" ADD VALUE 'commission-follow-up';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_sales_activities_activity_type'
            AND e.enumlabel = 'commercial-review'
        ) THEN
          ALTER TYPE "public"."enum_sales_activities_activity_type" ADD VALUE 'commercial-review';
        END IF;
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients"
      DROP COLUMN IF EXISTS "commercial_categories",
      DROP COLUMN IF EXISTS "pricing_classification",
      DROP COLUMN IF EXISTS "commercial_review_reason";
  `);
  await db.execute(sql`
    ALTER TABLE "client_infrastructure"
      DROP COLUMN IF EXISTS "hosting_annual_amount_cents",
      DROP COLUMN IF EXISTS "hosting_service_start_date",
      DROP COLUMN IF EXISTS "hosting_billing_due_date",
      DROP COLUMN IF EXISTS "hosting_auto_charge_mode",
      DROP COLUMN IF EXISTS "hosting_renewal_lifecycle",
      DROP COLUMN IF EXISTS "renewal_notice_sent_at";
  `);
  // Enum values cannot be safely removed in Postgres.
}
