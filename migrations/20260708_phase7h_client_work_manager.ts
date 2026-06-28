/**
 * KXD Core Phase 7H — Client Work Manager
 * client_tasks (+ labels, attachments child tables)
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_tasks_status') THEN
        CREATE TYPE "public"."enum_client_tasks_status"
          AS ENUM(
            'backlog', 'to-do', 'in-progress', 'review',
            'waiting-on-client', 'waiting-on-kxd', 'blocked', 'completed', 'cancelled'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_tasks_priority') THEN
        CREATE TYPE "public"."enum_client_tasks_priority"
          AS ENUM('critical', 'high', 'medium', 'low');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_tasks_category') THEN
        CREATE TYPE "public"."enum_client_tasks_category"
          AS ENUM(
            'website', 'seo', 'branding', 'design', 'marketing', 'crm',
            'automation', 'hosting', 'infrastructure', 'content', 'reporting', 'general'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_tasks" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "status" "public"."enum_client_tasks_status" DEFAULT 'backlog' NOT NULL,
      "priority" "public"."enum_client_tasks_priority" DEFAULT 'medium' NOT NULL,
      "category" "public"."enum_client_tasks_category" DEFAULT 'general' NOT NULL,
      "assigned_to_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "due_date" timestamp(3) with time zone,
      "start_date" timestamp(3) with time zone,
      "completed_date" timestamp(3) with time zone,
      "estimated_hours" numeric,
      "actual_hours" numeric,
      "client_visible" boolean DEFAULT true,
      "title" varchar NOT NULL,
      "description" varchar,
      "blocked_reason" varchar,
      "created_from" varchar,
      "notes" varchar,
      "dependencies" jsonb,
      "related_deliverable_id" integer REFERENCES "monthly_deliverables"("id") ON DELETE SET NULL,
      "related_request_id" integer REFERENCES "client_requests"("id") ON DELETE SET NULL,
      "related_playbook_id" integer REFERENCES "playbooks"("id") ON DELETE SET NULL,
      "related_report_id" integer REFERENCES "monthly_reports"("id") ON DELETE SET NULL,
      "related_proposal_id" integer REFERENCES "proposals"("id") ON DELETE SET NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_tasks_labels" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "client_tasks"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_tasks_attachments" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "client_tasks"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar,
      "url" varchar
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_tasks_client_idx" ON "client_tasks" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_project_idx" ON "client_tasks" USING btree ("project_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_assigned_to_idx" ON "client_tasks" USING btree ("assigned_to_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_status_idx" ON "client_tasks" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_tasks_category_idx" ON "client_tasks" USING btree ("category");
    CREATE INDEX IF NOT EXISTS "client_tasks_priority_idx" ON "client_tasks" USING btree ("priority");
    CREATE INDEX IF NOT EXISTS "client_tasks_due_date_idx" ON "client_tasks" USING btree ("due_date");
    CREATE INDEX IF NOT EXISTS "client_tasks_start_date_idx" ON "client_tasks" USING btree ("start_date");
    CREATE INDEX IF NOT EXISTS "client_tasks_completed_date_idx" ON "client_tasks" USING btree ("completed_date");
    CREATE INDEX IF NOT EXISTS "client_tasks_client_visible_idx" ON "client_tasks" USING btree ("client_visible");
    CREATE INDEX IF NOT EXISTS "client_tasks_related_deliverable_idx" ON "client_tasks" USING btree ("related_deliverable_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_related_request_idx" ON "client_tasks" USING btree ("related_request_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_related_playbook_idx" ON "client_tasks" USING btree ("related_playbook_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_related_report_idx" ON "client_tasks" USING btree ("related_report_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_related_proposal_idx" ON "client_tasks" USING btree ("related_proposal_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_updated_at_idx" ON "client_tasks" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "client_tasks_created_at_idx" ON "client_tasks" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "client_tasks_labels_order_idx" ON "client_tasks_labels" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "client_tasks_labels_parent_id_idx" ON "client_tasks_labels" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "client_tasks_attachments_order_idx" ON "client_tasks_attachments" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "client_tasks_attachments_parent_id_idx" ON "client_tasks_attachments" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "client_tasks_attachments" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_tasks_labels" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_tasks" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_tasks_category";
    DROP TYPE IF EXISTS "public"."enum_client_tasks_priority";
    DROP TYPE IF EXISTS "public"."enum_client_tasks_status";
  `);
}
