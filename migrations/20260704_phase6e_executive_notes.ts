/**
 * KXD Core Phase 6E — Executive Notes & Strategy Vault
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_executive_timeline_events_source_module'
          AND e.enumlabel = 'Executive Notes'
      ) THEN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Executive Notes';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_executive_notes_note_type') THEN
        CREATE TYPE "public"."enum_executive_notes_note_type"
          AS ENUM('strategy','meeting','opportunity','research','sales','website','infrastructure','marketing','finance','relationship','personal','follow-up','internal');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_executive_notes_priority') THEN
        CREATE TYPE "public"."enum_executive_notes_priority"
          AS ENUM('low','normal','high','critical');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_executive_notes_status') THEN
        CREATE TYPE "public"."enum_executive_notes_status"
          AS ENUM('active','archived');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_notes" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "title" varchar NOT NULL,
      "summary" varchar,
      "content" jsonb,
      "note_type" "public"."enum_executive_notes_note_type" DEFAULT 'strategy' NOT NULL,
      "priority" "public"."enum_executive_notes_priority" DEFAULT 'normal' NOT NULL,
      "status" "public"."enum_executive_notes_status" DEFAULT 'active' NOT NULL,
      "pinned" boolean DEFAULT false,
      "private" boolean DEFAULT false,
      "reminder_date" timestamp(3) with time zone,
      "author" varchar,
      "timeline_event_id" integer REFERENCES "executive_timeline_events"("id") ON DELETE SET NULL,
      "search_keywords" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "executive_notes_client_idx" ON "executive_notes" ("client_id");
    CREATE INDEX IF NOT EXISTS "executive_notes_status_idx" ON "executive_notes" ("status");
    CREATE INDEX IF NOT EXISTS "executive_notes_pinned_idx" ON "executive_notes" ("pinned");
    CREATE INDEX IF NOT EXISTS "executive_notes_reminder_idx" ON "executive_notes" ("reminder_date");
    CREATE INDEX IF NOT EXISTS "executive_notes_type_idx" ON "executive_notes" ("note_type");
    CREATE INDEX IF NOT EXISTS "executive_notes_updated_idx" ON "executive_notes" ("updated_at" DESC);
    CREATE INDEX IF NOT EXISTS "executive_notes_search_idx" ON "executive_notes" USING gin (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("summary", '') || ' ' || coalesce("search_keywords", '')));
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_notes_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "executive_notes"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_notes_attachments" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "executive_notes"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "file_id" integer REFERENCES "media"("id") ON DELETE SET NULL,
      "caption" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_notes_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL REFERENCES "executive_notes"("id") ON DELETE CASCADE,
      "path" varchar NOT NULL,
      "client_projects_id" integer REFERENCES "client_projects"("id") ON DELETE CASCADE,
      "monthly_reports_id" integer REFERENCES "monthly_reports"("id") ON DELETE CASCADE,
      "proposals_id" integer REFERENCES "proposals"("id") ON DELETE CASCADE,
      "creative_assets_id" integer REFERENCES "creative_assets"("id") ON DELETE CASCADE,
      "website_audits_id" integer REFERENCES "website_audits"("id") ON DELETE CASCADE,
      "client_infrastructure_id" integer REFERENCES "client_infrastructure"("id") ON DELETE CASCADE,
      "automation_events_id" integer REFERENCES "automation_events"("id") ON DELETE CASCADE
    );
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "executive_notes_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "executive_notes_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "executive_notes_rels" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "executive_notes_attachments" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "executive_notes_tags" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "executive_notes" CASCADE;`);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_executive_notes_status";
    DROP TYPE IF EXISTS "public"."enum_executive_notes_priority";
    DROP TYPE IF EXISTS "public"."enum_executive_notes_note_type";
  `);
}
