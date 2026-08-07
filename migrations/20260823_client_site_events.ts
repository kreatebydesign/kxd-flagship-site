/**
 * Additive: Client Site Event Registry (csi-v1-a).
 * Canonical ingest facts for Client Site Intelligence.
 * Local apply only until production migration is authorized.
 *
 * Naming note: `20260823` follows repository ascending migration-name sequence
 * after `20260822_continuous_intelligence_ops` (not calendar implementation day).
 * Payload applies migrations in migrations/index.ts array order.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_site_events_event_class') THEN
        CREATE TYPE "public"."enum_client_site_events_event_class" AS ENUM(
          'website_lead',
          'qualified_conversion',
          'confirmed_sale',
          'deployment',
          'seo_milestone',
          'indexing_milestone',
          'analytics_milestone',
          'form_config_change',
          'maintenance',
          'operator_work'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_site_events_sensitivity') THEN
        CREATE TYPE "public"."enum_client_site_events_sensitivity" AS ENUM(
          'internal', 'sensitive_contact', 'client_safe'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_site_events_visibility_state') THEN
        CREATE TYPE "public"."enum_client_site_events_visibility_state" AS ENUM(
          'internal_only', 'client_visible'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_site_events_processing_status') THEN
        CREATE TYPE "public"."enum_client_site_events_processing_status" AS ENUM(
          'received', 'persisted', 'activity_published', 'failed'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_site_events" (
      "id" serial PRIMARY KEY,
      "client_id" integer NOT NULL,
      "client_key" varchar NOT NULL,
      "event_class" "public"."enum_client_site_events_event_class" NOT NULL,
      "external_event_id" varchar NOT NULL,
      "source_system" varchar NOT NULL,
      "idempotency_key" varchar NOT NULL,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "received_at" timestamp(3) with time zone NOT NULL,
      "sensitivity" "public"."enum_client_site_events_sensitivity" NOT NULL DEFAULT 'sensitive_contact',
      "visibility_state" "public"."enum_client_site_events_visibility_state" NOT NULL DEFAULT 'internal_only',
      "processing_status" "public"."enum_client_site_events_processing_status" NOT NULL DEFAULT 'received',
      "payload" jsonb NOT NULL,
      "ingest_meta" jsonb,
      "activity_timeline_event_id" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  // Idempotency: sourceSystem + externalEventId + eventClass (and convenience unique on composed key).
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_site_events_source_external_class_uidx"
      ON "client_site_events" ("source_system", "external_event_id", "event_class");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_site_events_idempotency_key_uidx"
      ON "client_site_events" ("idempotency_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_client_id_idx"
      ON "client_site_events" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_client_key_idx"
      ON "client_site_events" ("client_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_event_class_idx"
      ON "client_site_events" ("event_class");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_received_at_idx"
      ON "client_site_events" ("received_at");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_visibility_state_idx"
      ON "client_site_events" ("visibility_state");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_site_events_processing_status_idx"
      ON "client_site_events" ("processing_status");
  `);

  // Optional FK when clients table exists (local/prod postgres). Soft-guarded.
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'clients'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_site_events_client_id_clients_id_fk'
      ) THEN
        ALTER TABLE "client_site_events"
          ADD CONSTRAINT "client_site_events_client_id_clients_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Non-destructive rollback doctrine — drop only indexes added here; leave table.
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_site_events_source_external_class_uidx";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_site_events_idempotency_key_uidx";
  `);
}
