/**
 * Phase 20A — Work Engine schema extensions.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_work_status') THEN
        ALTER TYPE "public"."enum_work_status" ADD VALUE IF NOT EXISTS 'waiting-on-kxd';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      ALTER COLUMN "client_id" DROP NOT NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      ADD COLUMN IF NOT EXISTS "internal_project" varchar,
      ADD COLUMN IF NOT EXISTS "estimated_effort" numeric,
      ADD COLUMN IF NOT EXISTS "start_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "description" varchar,
      ADD COLUMN IF NOT EXISTS "notes" varchar,
      ADD COLUMN IF NOT EXISTS "parent_work_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_parent_work_id_fk'
      ) THEN
        ALTER TABLE "work"
          ADD CONSTRAINT "work_parent_work_id_fk"
          FOREIGN KEY ("parent_work_id")
          REFERENCES "public"."work"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "work_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "work"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "work_activity_history" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "work"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "at" timestamp(3) with time zone,
      "actor" varchar,
      "action" varchar NOT NULL,
      "detail" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "work_attachments" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "work"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar,
      "media_id" integer
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_attachments_media_fk'
      ) THEN
        ALTER TABLE "work_attachments"
          ADD CONSTRAINT "work_attachments_media_fk"
          FOREIGN KEY ("media_id")
          REFERENCES "public"."media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "work_parent_work_idx"
      ON "work" USING btree ("parent_work_id");
    CREATE INDEX IF NOT EXISTS "work_due_date_idx"
      ON "work" USING btree ("due_date");
    CREATE INDEX IF NOT EXISTS "work_tags_parent_idx"
      ON "work_tags" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "work_activity_history_parent_idx"
      ON "work_activity_history" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "work_attachments_parent_idx"
      ON "work_attachments" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "work_attachments_parent_idx";
    DROP INDEX IF EXISTS "work_activity_history_parent_idx";
    DROP INDEX IF EXISTS "work_tags_parent_idx";
    DROP INDEX IF EXISTS "work_parent_work_idx";
    DROP INDEX IF EXISTS "work_due_date_idx";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "work_attachments";
    DROP TABLE IF EXISTS "work_activity_history";
    DROP TABLE IF EXISTS "work_tags";
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      DROP CONSTRAINT IF EXISTS "work_parent_work_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "work"
      DROP COLUMN IF EXISTS "internal_project",
      DROP COLUMN IF EXISTS "estimated_effort",
      DROP COLUMN IF EXISTS "start_date",
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "notes",
      DROP COLUMN IF EXISTS "parent_work_id";
  `);
}
