/**
 * KXD Core Phase 5E — Automation & Event Engine
 * automation_events, automation_notifications
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_automation_events_module') THEN
        CREATE TYPE "public"."enum_automation_events_module"
          AS ENUM(
            'Launch', 'Onboarding', 'Infrastructure', 'Website Auditor',
            'Founder Intelligence', 'Growth', 'Creative', 'Projects',
            'Requests', 'Deliverables', 'Portal', 'Automation'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_automation_events_status') THEN
        CREATE TYPE "public"."enum_automation_events_status"
          AS ENUM('published', 'processed', 'failed');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_automation_notifications_severity') THEN
        CREATE TYPE "public"."enum_automation_notifications_severity"
          AS ENUM('info', 'warning', 'critical', 'success');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_automation_notifications_status') THEN
        CREATE TYPE "public"."enum_automation_notifications_status"
          AS ENUM('queued', 'resolved');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "automation_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "module" "public"."enum_automation_events_module" NOT NULL,
      "event_name" varchar NOT NULL,
      "status" "public"."enum_automation_events_status" DEFAULT 'published' NOT NULL,
      "rule_id" varchar,
      "payload" jsonb,
      "error_message" varchar,
      "processed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "automation_notifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "title" varchar NOT NULL,
      "summary" varchar,
      "severity" "public"."enum_automation_notifications_severity" DEFAULT 'info' NOT NULL,
      "module" varchar NOT NULL,
      "status" "public"."enum_automation_notifications_status" DEFAULT 'queued' NOT NULL,
      "resolved_at" timestamp(3) with time zone,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "automation_events_client_idx"
      ON "automation_events" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "automation_events_status_idx"
      ON "automation_events" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "automation_events_module_idx"
      ON "automation_events" USING btree ("module");
    CREATE INDEX IF NOT EXISTS "automation_events_created_at_idx"
      ON "automation_events" USING btree ("created_at" DESC);
    CREATE INDEX IF NOT EXISTS "automation_notifications_status_idx"
      ON "automation_notifications" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "automation_notifications_severity_idx"
      ON "automation_notifications" USING btree ("severity");
    CREATE INDEX IF NOT EXISTS "automation_notifications_created_at_idx"
      ON "automation_notifications" USING btree ("created_at" DESC);
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "automation_events_id" integer,
      ADD COLUMN IF NOT EXISTS "automation_notifications_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "automation_notifications_id",
      DROP COLUMN IF EXISTS "automation_events_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "automation_notifications" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "automation_events" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_automation_notifications_status";
    DROP TYPE IF EXISTS "public"."enum_automation_notifications_severity";
    DROP TYPE IF EXISTS "public"."enum_automation_events_status";
    DROP TYPE IF EXISTS "public"."enum_automation_events_module";
  `);
}
