/**
 * Additive: client calendar event type `track_day` for Primal portal editing.
 * Postgres cannot remove enum values in down().
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      BEGIN
        ALTER TYPE "public"."enum_client_calendar_events_event_type"
          ADD VALUE 'track_day';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  void db;
}
