/**
 * KXD OS Phase 20E — Executive Activity Engine read markers
 * executive_activity_reads — per-operator read state for Activity Center
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "executive_activity_reads" (
      "id" serial PRIMARY KEY NOT NULL,
      "event_id" integer NOT NULL REFERENCES "executive_timeline_events"("id") ON DELETE CASCADE,
      "reader_key" varchar NOT NULL,
      "read_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "executive_activity_reads_event_idx"
      ON "executive_activity_reads" USING btree ("event_id");
    CREATE INDEX IF NOT EXISTS "executive_activity_reads_reader_key_idx"
      ON "executive_activity_reads" USING btree ("reader_key");
    CREATE INDEX IF NOT EXISTS "executive_activity_reads_read_at_idx"
      ON "executive_activity_reads" USING btree ("read_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "executive_activity_reads_event_reader_uidx"
      ON "executive_activity_reads" USING btree ("event_id", "reader_key");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "executive_activity_reads_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "executive_activity_reads_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "executive_activity_reads" CASCADE;`);
}
