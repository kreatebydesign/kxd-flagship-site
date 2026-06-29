/**
 * KXD OS Phase 8E — Client Actions Engine
 * client_actions
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_actions_source') THEN
        CREATE TYPE "public"."enum_client_actions_source"
          AS ENUM('Communication', 'Intelligence', 'Executive', 'Timeline', 'Manual', 'Revenue', 'Retention');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_actions_priority') THEN
        CREATE TYPE "public"."enum_client_actions_priority"
          AS ENUM('low', 'medium', 'high', 'critical');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_actions_status') THEN
        CREATE TYPE "public"."enum_client_actions_status"
          AS ENUM('pending', 'in-progress', 'waiting', 'completed', 'dismissed', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_actions_action_type') THEN
        CREATE TYPE "public"."enum_client_actions_action_type"
          AS ENUM('follow-up', 'email', 'phone-call', 'meeting', 'proposal', 'upsell', 'task', 'project', 'reminder', 'custom');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_actions" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "title" varchar NOT NULL,
      "description" varchar,
      "source" "public"."enum_client_actions_source" DEFAULT 'Manual' NOT NULL,
      "priority" "public"."enum_client_actions_priority" DEFAULT 'medium' NOT NULL,
      "status" "public"."enum_client_actions_status" DEFAULT 'pending' NOT NULL,
      "action_type" "public"."enum_client_actions_action_type" DEFAULT 'task' NOT NULL,
      "created_by" varchar,
      "assigned_to" varchar,
      "due_date" timestamp(3) with time zone,
      "completed_date" timestamp(3) with time zone,
      "related_communication_id" integer REFERENCES "client_communications"("id") ON DELETE SET NULL,
      "related_project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_request_id" integer REFERENCES "client_requests"("id") ON DELETE SET NULL,
      "related_timeline_event_id" integer REFERENCES "executive_timeline_events"("id") ON DELETE SET NULL,
      "memory_reference" varchar,
      "executive_notes" varchar,
      "result" varchar,
      "completion_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_actions_client_idx" ON "client_actions" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_actions_source_idx" ON "client_actions" USING btree ("source");
    CREATE INDEX IF NOT EXISTS "client_actions_priority_idx" ON "client_actions" USING btree ("priority");
    CREATE INDEX IF NOT EXISTS "client_actions_status_idx" ON "client_actions" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_actions_action_type_idx" ON "client_actions" USING btree ("action_type");
    CREATE INDEX IF NOT EXISTS "client_actions_due_date_idx" ON "client_actions" USING btree ("due_date");
    CREATE INDEX IF NOT EXISTS "client_actions_memory_reference_idx" ON "client_actions" USING btree ("memory_reference");
    CREATE INDEX IF NOT EXISTS "client_actions_related_communication_idx" ON "client_actions" USING btree ("related_communication_id");
    CREATE INDEX IF NOT EXISTS "client_actions_related_project_idx" ON "client_actions" USING btree ("related_project_id");
    CREATE INDEX IF NOT EXISTS "client_actions_related_request_idx" ON "client_actions" USING btree ("related_request_id");
    CREATE INDEX IF NOT EXISTS "client_actions_related_timeline_event_idx" ON "client_actions" USING btree ("related_timeline_event_id");
    CREATE INDEX IF NOT EXISTS "client_actions_updated_at_idx" ON "client_actions" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "client_actions_created_at_idx" ON "client_actions" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "client_actions" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_actions_action_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_actions_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_actions_priority";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_actions_source";`);
}
