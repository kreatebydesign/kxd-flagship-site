/**
 * Phase 34D — Website Workspace ClientRequests enum expansion.
 *
 * Payload ClientRequests gained:
 *   - experienceModule: website-workspace
 *   - status: approved
 *
 * PostgreSQL enums were never updated, so portal queries filtering
 * experience_module = 'website-workspace' fail at runtime.
 *
 * Idempotent — safe if values already exist.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_requests_experience_module'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_requests_experience_module"
          AS ENUM('website-review', 'website-workspace');
      ELSE
        BEGIN
          ALTER TYPE "public"."enum_client_requests_experience_module"
            ADD VALUE 'website-workspace';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_requests_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_requests_status"
          AS ENUM(
            'new',
            'triaged',
            'approved',
            'in-progress',
            'waiting-on-client',
            'complete',
            'declined'
          );
      ELSE
        BEGIN
          ALTER TYPE "public"."enum_client_requests_status"
            ADD VALUE 'approved';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot remove enum values safely without recreating the type.
  void db;
}
