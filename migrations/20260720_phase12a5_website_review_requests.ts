/**
 * Phase 12A.5 — CES Website Review fields on client_requests
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
      ADD COLUMN IF NOT EXISTS "page_context" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_requests"
      DROP COLUMN IF EXISTS "experience_module",
      DROP COLUMN IF EXISTS "page_context";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_requests_experience_module";
  `);
}
