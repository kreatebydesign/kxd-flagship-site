/**
 * KXD Core Phase 12A.2 — KXD Work Items foundation
 * Extends client_tasks with sourceType, retainer/upgrade links, internal notes
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_tasks_source_type') THEN
        CREATE TYPE "public"."enum_client_tasks_source_type"
          AS ENUM(
            'client-request', 'monthly-deliverable', 'project-task', 'follow-up',
            'admin-task', 'upgrade-offer', 'growth-opportunity', 'playbook-step',
            'portal-request', 'retainer-task', 'content', 'website', 'seo', 'ads',
            'internal', 'manual'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "client_tasks"
      ADD COLUMN IF NOT EXISTS "source_type" "public"."enum_client_tasks_source_type",
      ADD COLUMN IF NOT EXISTS "related_retainer_id" integer REFERENCES "retainers"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "related_upgrade_offer_id" integer,
      ADD COLUMN IF NOT EXISTS "internal_notes" varchar;
  `);

  await db.execute(sql`
    UPDATE "client_tasks"
    SET "source_type" = 'manual'
    WHERE "source_type" IS NULL
      AND ("created_from" IS NULL OR "created_from" = '' OR "created_from" = 'manual');
  `);

  await db.execute(sql`
    UPDATE "client_tasks"
    SET "source_type" = 'portal-request'
    WHERE "source_type" IS NULL
      AND "created_from" ILIKE '%portal%';
  `);

  await db.execute(sql`
    UPDATE "client_tasks"
    SET "source_type" = 'client-request'
    WHERE "source_type" IS NULL
      AND "related_request_id" IS NOT NULL;
  `);

  await db.execute(sql`
    UPDATE "client_tasks"
    SET "source_type" = 'monthly-deliverable'
    WHERE "source_type" IS NULL
      AND "related_deliverable_id" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_tasks"
      DROP COLUMN IF EXISTS "internal_notes",
      DROP COLUMN IF EXISTS "related_upgrade_offer_id",
      DROP COLUMN IF EXISTS "related_retainer_id",
      DROP COLUMN IF EXISTS "source_type";
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_tasks_source_type";
  `);
}
