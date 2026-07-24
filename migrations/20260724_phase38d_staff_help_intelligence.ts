/**
 * Phase 38D — Staff help request intelligence response fields.
 * Additive. Preserves existing mattResponse / status model.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_staff_help_requests_response_source'
      ) THEN
        CREATE TYPE "public"."enum_staff_help_requests_response_source" AS ENUM(
          'none',
          'deterministic',
          'ai-assisted',
          'matt'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_staff_help_requests_confidence'
      ) THEN
        CREATE TYPE "public"."enum_staff_help_requests_confidence" AS ENUM(
          'high',
          'medium',
          'low'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_help_requests"
      ADD COLUMN IF NOT EXISTS "intelligence_response" varchar,
      ADD COLUMN IF NOT EXISTS "response_source" "public"."enum_staff_help_requests_response_source" DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "confidence" "public"."enum_staff_help_requests_confidence",
      ADD COLUMN IF NOT EXISTS "requires_matt" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "intelligence_responded_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "matt_responded_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "staff_help_requests"
      DROP COLUMN IF EXISTS "matt_responded_at",
      DROP COLUMN IF EXISTS "intelligence_responded_at",
      DROP COLUMN IF EXISTS "requires_matt",
      DROP COLUMN IF EXISTS "confidence",
      DROP COLUMN IF EXISTS "response_source",
      DROP COLUMN IF EXISTS "intelligence_response";
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_staff_help_requests_response_source') THEN
        DROP TYPE "public"."enum_staff_help_requests_response_source";
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_staff_help_requests_confidence') THEN
        DROP TYPE "public"."enum_staff_help_requests_confidence";
      END IF;
    END $$;
  `);
}
