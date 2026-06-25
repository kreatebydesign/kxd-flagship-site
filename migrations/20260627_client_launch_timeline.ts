/**
 * KXD OS — client_timeline_events table for Client Workspace timeline module.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_client_timeline_events_event_type'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_client_timeline_events_event_type"
          AS ENUM(
            'client-launch',
            'website-launch',
            'portal-launch',
            'seo-audit',
            'google-ads',
            'meeting',
            'invoice-paid',
            'deployment',
            'feature-request',
            'review-received',
            'domain-renewal',
            'referral',
            'client-milestone'
          );
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_timeline_events" (
      "id"          serial PRIMARY KEY NOT NULL,
      "client_id"   integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "event_type"  "public"."enum_client_timeline_events_event_type" NOT NULL,
      "title"       varchar NOT NULL,
      "summary"     varchar,
      "event_date"  timestamp(3) with time zone NOT NULL,
      "created_by"  varchar,
      "source"      varchar,
      "updated_at"  timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"  timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_timeline_events_client_idx"
      ON "client_timeline_events" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_timeline_events_event_date_idx"
      ON "client_timeline_events" USING btree ("event_date" DESC);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_timeline_events_event_date_idx";
    DROP INDEX IF EXISTS "client_timeline_events_client_idx";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "client_timeline_events" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_client_timeline_events_event_type";
  `);
}
