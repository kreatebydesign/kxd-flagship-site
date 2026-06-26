/**
 * KXD Core Phase 5D — Executive Timeline
 * executive_timeline_events — permanent relationship history
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_executive_timeline_events_category') THEN
        CREATE TYPE "public"."enum_executive_timeline_events_category"
          AS ENUM(
            'relationship', 'project', 'creative', 'infrastructure', 'website', 'seo',
            'analytics', 'marketing', 'finance', 'onboarding', 'meeting', 'communication',
            'support', 'launch', 'growth', 'system'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_executive_timeline_events_importance') THEN
        CREATE TYPE "public"."enum_executive_timeline_events_importance"
          AS ENUM('low', 'normal', 'high', 'critical');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_executive_timeline_events_status') THEN
        CREATE TYPE "public"."enum_executive_timeline_events_status"
          AS ENUM('active', 'open', 'completed', 'archived', 'cancelled');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_executive_timeline_events_source_module') THEN
        CREATE TYPE "public"."enum_executive_timeline_events_source_module"
          AS ENUM(
            'Launch', 'Client HQ', 'Infrastructure', 'Founder Intelligence', 'Audits',
            'Creative', 'Reels', 'Accounts', 'Growth', 'Portal', 'Website Auditor', 'Manual'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_timeline_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "infrastructure_id" integer REFERENCES "client_infrastructure"("id") ON DELETE SET NULL,
      "request_id" integer REFERENCES "client_requests"("id") ON DELETE SET NULL,
      "deliverable_id" integer REFERENCES "monthly_deliverables"("id") ON DELETE SET NULL,
      "event_type" varchar NOT NULL,
      "title" varchar NOT NULL,
      "summary" varchar,
      "description" varchar,
      "category" "public"."enum_executive_timeline_events_category" DEFAULT 'relationship' NOT NULL,
      "status" "public"."enum_executive_timeline_events_status" DEFAULT 'active',
      "importance" "public"."enum_executive_timeline_events_importance" DEFAULT 'normal' NOT NULL,
      "source_module" "public"."enum_executive_timeline_events_source_module" DEFAULT 'Manual' NOT NULL,
      "created_by" varchar,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "metadata" jsonb,
      "internal_only" boolean DEFAULT true,
      "pinned" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "executive_timeline_events_client_idx"
      ON "executive_timeline_events" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "executive_timeline_events_occurred_at_idx"
      ON "executive_timeline_events" USING btree ("occurred_at" DESC);
    CREATE INDEX IF NOT EXISTS "executive_timeline_events_category_idx"
      ON "executive_timeline_events" USING btree ("category");
    CREATE INDEX IF NOT EXISTS "executive_timeline_events_importance_idx"
      ON "executive_timeline_events" USING btree ("importance");
    CREATE INDEX IF NOT EXISTS "executive_timeline_events_pinned_idx"
      ON "executive_timeline_events" USING btree ("pinned");
    CREATE INDEX IF NOT EXISTS "executive_timeline_events_source_module_idx"
      ON "executive_timeline_events" USING btree ("source_module");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "executive_timeline_events_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "executive_timeline_events_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "executive_timeline_events" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_executive_timeline_events_source_module";
    DROP TYPE IF EXISTS "public"."enum_executive_timeline_events_status";
    DROP TYPE IF EXISTS "public"."enum_executive_timeline_events_importance";
    DROP TYPE IF EXISTS "public"."enum_executive_timeline_events_category";
  `);
}
