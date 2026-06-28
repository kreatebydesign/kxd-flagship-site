/**
 * KXD Core Phase 7E — Playbooks & SOP Engine
 * playbooks, playbook_steps, playbook_runs (+ child tables)
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_playbooks_applies_to') THEN
        CREATE TYPE "public"."enum_playbooks_applies_to"
          AS ENUM(
            'agency', 'client', 'project', 'website', 'campaign',
            'motorsports', 'contractor', 'hospitality',
            'professional-services', 'future-editions'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_playbooks_category') THEN
        CREATE TYPE "public"."enum_playbooks_category"
          AS ENUM(
            'launch', 'onboarding', 'seo', 'reporting', 'sales',
            'audit', 'strategy', 'vertical', 'operations'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_playbook_steps_linked_module') THEN
        CREATE TYPE "public"."enum_playbook_steps_linked_module"
          AS ENUM(
            'Projects', 'Reporting', 'Sales', 'Infrastructure', 'Creative',
            'Strategy Vault', 'Timeline', 'Automation', 'Portal', 'Launch', 'Onboarding'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_playbook_steps_automation_trigger') THEN
        CREATE TYPE "public"."enum_playbook_steps_automation_trigger"
          AS ENUM(
            'none', 'create_deliverable', 'create_request', 'generate_report',
            'schedule_meeting', 'create_executive_note', 'run_website_audit',
            'launch_client', 'generate_proposal', 'send_portal_invite'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_playbook_runs_status') THEN
        CREATE TYPE "public"."enum_playbook_runs_status"
          AS ENUM('not-started', 'in-progress', 'blocked', 'completed', 'archived');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playbooks" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "category" "public"."enum_playbooks_category" NOT NULL,
      "active" boolean DEFAULT true,
      "version" varchar DEFAULT '1.0',
      "icon" varchar,
      "color" varchar,
      "estimated_duration" varchar,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playbooks_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "playbooks"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playbooks_applies_to" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL REFERENCES "playbooks"("id") ON DELETE CASCADE,
      "value" "public"."enum_playbooks_applies_to",
      "id" serial PRIMARY KEY NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playbook_steps" (
      "id" serial PRIMARY KEY NOT NULL,
      "playbook_id" integer NOT NULL REFERENCES "playbooks"("id") ON DELETE SET NULL,
      "order" numeric NOT NULL,
      "required" boolean DEFAULT true,
      "estimated_minutes" numeric,
      "linked_module" "public"."enum_playbook_steps_linked_module",
      "automation_trigger" "public"."enum_playbook_steps_automation_trigger" DEFAULT 'none',
      "title" varchar NOT NULL,
      "description" varchar,
      "instructions" varchar,
      "completion_rule" varchar,
      "depends_on_id" integer REFERENCES "playbook_steps"("id") ON DELETE SET NULL,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playbook_steps_attachments" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "playbook_steps"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar,
      "url" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playbook_runs" (
      "id" serial PRIMARY KEY NOT NULL,
      "playbook_id" integer NOT NULL REFERENCES "playbooks"("id") ON DELETE SET NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "status" "public"."enum_playbook_runs_status" DEFAULT 'not-started' NOT NULL,
      "started_by_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "assigned_to_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "started_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "percent_complete" numeric DEFAULT 0,
      "current_step_id" integer REFERENCES "playbook_steps"("id") ON DELETE SET NULL,
      "duration_minutes" numeric,
      "completed_steps" jsonb,
      "skipped_steps" jsonb,
      "timeline_event_ids" jsonb,
      "automation_event_ids" jsonb,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "playbooks_slug_idx" ON "playbooks" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "playbooks_category_idx" ON "playbooks" USING btree ("category");
    CREATE INDEX IF NOT EXISTS "playbooks_active_idx" ON "playbooks" USING btree ("active");
    CREATE INDEX IF NOT EXISTS "playbooks_updated_at_idx" ON "playbooks" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "playbooks_created_at_idx" ON "playbooks" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "playbooks_tags_order_idx" ON "playbooks_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "playbooks_tags_parent_id_idx" ON "playbooks_tags" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "playbooks_applies_to_order_idx" ON "playbooks_applies_to" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "playbooks_applies_to_parent_idx" ON "playbooks_applies_to" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "playbook_steps_playbook_idx" ON "playbook_steps" USING btree ("playbook_id");
    CREATE INDEX IF NOT EXISTS "playbook_steps_depends_on_idx" ON "playbook_steps" USING btree ("depends_on_id");
    CREATE INDEX IF NOT EXISTS "playbook_steps_updated_at_idx" ON "playbook_steps" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "playbook_steps_created_at_idx" ON "playbook_steps" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "playbook_steps_attachments_order_idx" ON "playbook_steps_attachments" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "playbook_steps_attachments_parent_id_idx" ON "playbook_steps_attachments" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "playbook_runs_playbook_idx" ON "playbook_runs" USING btree ("playbook_id");
    CREATE INDEX IF NOT EXISTS "playbook_runs_client_idx" ON "playbook_runs" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "playbook_runs_project_idx" ON "playbook_runs" USING btree ("project_id");
    CREATE INDEX IF NOT EXISTS "playbook_runs_status_idx" ON "playbook_runs" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "playbook_runs_started_by_idx" ON "playbook_runs" USING btree ("started_by_id");
    CREATE INDEX IF NOT EXISTS "playbook_runs_assigned_to_idx" ON "playbook_runs" USING btree ("assigned_to_id");
    CREATE INDEX IF NOT EXISTS "playbook_runs_current_step_idx" ON "playbook_runs" USING btree ("current_step_id");
    CREATE INDEX IF NOT EXISTS "playbook_runs_updated_at_idx" ON "playbook_runs" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "playbook_runs_created_at_idx" ON "playbook_runs" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "playbook_runs" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "playbook_steps_attachments" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "playbook_steps" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "playbooks_applies_to" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "playbooks_tags" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "playbooks" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_playbook_runs_status";
    DROP TYPE IF EXISTS "public"."enum_playbook_steps_automation_trigger";
    DROP TYPE IF EXISTS "public"."enum_playbook_steps_linked_module";
    DROP TYPE IF EXISTS "public"."enum_playbooks_category";
    DROP TYPE IF EXISTS "public"."enum_playbooks_applies_to";
  `);
}
