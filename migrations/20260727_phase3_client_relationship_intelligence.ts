/**
 * Phase 3 Batch A — Client & Relationship Intelligence data foundation.
 * Additive tables for client-contacts and client-relationship-events.
 * Does not mutate Clients, Executive Client Profiles, timeline collections,
 * or existing flat/embedded contact fields. No data backfill.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_contacts_status'
      ) THEN
        CREATE TYPE "public"."enum_client_contacts_status" AS ENUM(
          'active',
          'inactive'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_relationship_events_event_category'
      ) THEN
        CREATE TYPE "public"."enum_client_relationship_events_event_category" AS ENUM(
          'meeting',
          'dinner',
          'engagement',
          'visit',
          'other'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_relationship_events_status'
      ) THEN
        CREATE TYPE "public"."enum_client_relationship_events_status" AS ENUM(
          'planned',
          'completed',
          'cancelled'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_contacts" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL,
      "status" "public"."enum_client_contacts_status" DEFAULT 'active' NOT NULL,
      "internal_only" boolean DEFAULT true,
      "name" varchar NOT NULL,
      "role_title" varchar,
      "email" varchar,
      "phone" varchar,
      "preferred_communication" varchar,
      "relationship_notes" varchar,
      "preferences" varchar,
      "dietary_notes" varchar,
      "accessibility_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "client_contacts"
        ADD CONSTRAINT "client_contacts_client_id_clients_id_fk"
        FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_contacts_client_idx"
      ON "client_contacts" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_contacts_status_idx"
      ON "client_contacts" ("status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_contacts_updated_idx"
      ON "client_contacts" ("updated_at");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_relationship_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL,
      "event_category" "public"."enum_client_relationship_events_event_category" DEFAULT 'meeting' NOT NULL,
      "status" "public"."enum_client_relationship_events_status" DEFAULT 'planned' NOT NULL,
      "internal_only" boolean DEFAULT true,
      "title" varchar NOT NULL,
      "event_at" timestamp(3) with time zone NOT NULL,
      "location" varchar,
      "context_notes" varchar,
      "follow_up_notes" varchar,
      "dietary_notes" varchar,
      "accessibility_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "client_relationship_events"
        ADD CONSTRAINT "client_relationship_events_client_id_clients_id_fk"
        FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_relationship_events_client_idx"
      ON "client_relationship_events" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_relationship_events_event_at_idx"
      ON "client_relationship_events" ("event_at");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_relationship_events_status_idx"
      ON "client_relationship_events" ("status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_relationship_events_updated_idx"
      ON "client_relationship_events" ("updated_at");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_relationship_events_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "client_contacts_id" integer
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "client_relationship_events_rels"
        ADD CONSTRAINT "client_relationship_events_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."client_relationship_events"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "client_relationship_events_rels"
        ADD CONSTRAINT "client_relationship_events_rels_client_contacts_fk"
        FOREIGN KEY ("client_contacts_id") REFERENCES "public"."client_contacts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_relationship_events_rels_parent_idx"
      ON "client_relationship_events_rels" ("parent_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_relationship_events_rels_path_idx"
      ON "client_relationship_events_rels" ("path");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_relationship_events_rels_contacts_idx"
      ON "client_relationship_events_rels" ("client_contacts_id");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "client_contacts_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "client_relationship_events_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "client_relationship_events_id";
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "client_contacts_id";
  `);

  await db.execute(sql`DROP TABLE IF EXISTS "client_relationship_events_rels" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_relationship_events" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_contacts" CASCADE;`);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_relationship_events_status";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_relationship_events_event_category";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_contacts_status";
  `);
}
