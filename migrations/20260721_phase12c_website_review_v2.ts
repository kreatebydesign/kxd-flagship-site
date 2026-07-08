/**
 * Phase 12C — Website Review V2: client review attachments + structured page context
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_review_media" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "related_request_id" integer REFERENCES "client_requests"("id") ON DELETE SET NULL,
      "original_filename" varchar,
      "uploaded_by_email" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric,
      "sizes_preview_url" varchar,
      "sizes_preview_width" numeric,
      "sizes_preview_height" numeric,
      "sizes_preview_mime_type" varchar,
      "sizes_preview_filesize" numeric,
      "sizes_preview_filename" varchar
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_review_media_client_idx"
      ON "client_review_media" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_review_media_request_idx"
      ON "client_review_media" USING btree ("related_request_id");
    CREATE INDEX IF NOT EXISTS "client_review_media_created_at_idx"
      ON "client_review_media" USING btree ("created_at" DESC);
  `);

  await db.execute(sql`
    ALTER TABLE "client_requests"
      ADD COLUMN IF NOT EXISTS "review_context" jsonb;
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "client_review_media_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payload_locked_documents_rels_client_review_media_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_client_review_media_fk"
          FOREIGN KEY ("client_review_media_id")
          REFERENCES "public"."client_review_media"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_client_review_media_id_idx"
      ON "payload_locked_documents_rels" USING btree ("client_review_media_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_client_review_media_id_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_client_review_media_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "client_review_media_id";
  `);

  await db.execute(sql`
    ALTER TABLE "client_requests"
      DROP COLUMN IF EXISTS "review_context";
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "client_review_media_created_at_idx";
    DROP INDEX IF EXISTS "client_review_media_request_idx";
    DROP INDEX IF EXISTS "client_review_media_client_idx";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "client_review_media" CASCADE;
  `);
}
