/**
 * KXD OS Phase 14B — Work Engine foundation
 * First-class work collection — operational heartbeat of client relationships.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_status') THEN
        CREATE TYPE "public"."enum_work_status"
          AS ENUM(
            'new', 'planned', 'in-progress', 'waiting-on-client',
            'blocked', 'review', 'completed', 'archived'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_priority') THEN
        CREATE TYPE "public"."enum_work_priority"
          AS ENUM('low', 'normal', 'high', 'critical');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_source') THEN
        CREATE TYPE "public"."enum_work_source"
          AS ENUM(
            'website-review', 'client-request', 'communication', 'manual',
            'future-ai', 'future-automation', 'future-onboarding',
            'future-brand-center', 'future-marketing'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_category') THEN
        CREATE TYPE "public"."enum_work_category"
          AS ENUM(
            'website', 'creative', 'content', 'strategy', 'communication',
            'onboarding', 'reporting', 'operations', 'general'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "work" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "status" "public"."enum_work_status" DEFAULT 'new' NOT NULL,
      "priority" "public"."enum_work_priority" DEFAULT 'normal' NOT NULL,
      "source" "public"."enum_work_source" DEFAULT 'manual' NOT NULL,
      "category" "public"."enum_work_category" DEFAULT 'general' NOT NULL,
      "assigned_to_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "client_visible" boolean DEFAULT false,
      "timeline_enabled" boolean DEFAULT true,
      "due_date" timestamp(3) with time zone,
      "started_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "title" varchar NOT NULL,
      "summary" varchar,
      "source_id" varchar,
      "created_by" varchar,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "work_client_idx" ON "work" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "work_status_idx" ON "work" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "work_priority_idx" ON "work" USING btree ("priority");
    CREATE INDEX IF NOT EXISTS "work_source_idx" ON "work" USING btree ("source");
    CREATE INDEX IF NOT EXISTS "work_category_idx" ON "work" USING btree ("category");
    CREATE INDEX IF NOT EXISTS "work_source_id_idx" ON "work" USING btree ("source_id");
    CREATE INDEX IF NOT EXISTS "work_assigned_to_idx" ON "work" USING btree ("assigned_to_id");
    CREATE INDEX IF NOT EXISTS "work_client_visible_idx" ON "work" USING btree ("client_visible");
    CREATE INDEX IF NOT EXISTS "work_timeline_enabled_idx" ON "work" USING btree ("timeline_enabled");
    CREATE INDEX IF NOT EXISTS "work_due_date_idx" ON "work" USING btree ("due_date");
    CREATE INDEX IF NOT EXISTS "work_started_at_idx" ON "work" USING btree ("started_at");
    CREATE INDEX IF NOT EXISTS "work_completed_at_idx" ON "work" USING btree ("completed_at");
    CREATE INDEX IF NOT EXISTS "work_updated_at_idx" ON "work" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "work_created_at_idx" ON "work" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "work_client_source_source_id_idx"
      ON "work" ("client_id", "source", "source_id")
      WHERE "source_id" IS NOT NULL AND "source_id" != '';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "work" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_work_category";
    DROP TYPE IF EXISTS "public"."enum_work_source";
    DROP TYPE IF EXISTS "public"."enum_work_priority";
    DROP TYPE IF EXISTS "public"."enum_work_status";
  `);
}
