/**
 * Phase 12D repair — idempotent ensure for Website Review schema on client_requests.
 * Safe to run even if 20260720 / 20260721 already applied.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_requests_experience_module'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_requests_experience_module"
          AS ENUM('website-review');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_requests"
      ADD COLUMN IF NOT EXISTS "experience_module" "public"."enum_client_requests_experience_module",
      ADD COLUMN IF NOT EXISTS "page_context" varchar,
      ADD COLUMN IF NOT EXISTS "review_context" jsonb;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_requests_experience_module_idx"
      ON "client_requests" USING btree ("experience_module")
      WHERE "experience_module" IS NOT NULL;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_requests_client_experience_module_idx"
      ON "client_requests" USING btree ("client_id", "experience_module")
      WHERE "experience_module" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_requests_client_experience_module_idx";
    DROP INDEX IF EXISTS "client_requests_experience_module_idx";
  `);
}
