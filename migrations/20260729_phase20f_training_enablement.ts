/**
 * KXD OS Phase 20F — Training & Enablement Workspace
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_training_learning_paths_status') THEN
        CREATE TYPE "public"."enum_training_learning_paths_status"
          AS ENUM('draft', 'published', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_training_lessons_status') THEN
        CREATE TYPE "public"."enum_training_lessons_status"
          AS ENUM('draft', 'published', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_training_lessons_work_stage') THEN
        CREATE TYPE "public"."enum_training_lessons_work_stage"
          AS ENUM('learn', 'practice', 'review', 'approved', 'independent');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_training_learner_progress_status') THEN
        CREATE TYPE "public"."enum_training_learner_progress_status"
          AS ENUM('not-started', 'started', 'in-progress', 'completed');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "training_learning_paths" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "status" "public"."enum_training_learning_paths_status" DEFAULT 'draft' NOT NULL,
      "sort_order" numeric DEFAULT 100 NOT NULL,
      "estimated_minutes" numeric,
      "summary" varchar,
      "description" varchar,
      "audience" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "training_learning_paths_slug_idx"
      ON "training_learning_paths" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "training_learning_paths_status_idx"
      ON "training_learning_paths" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "training_learning_paths_sort_order_idx"
      ON "training_learning_paths" USING btree ("sort_order");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "training_lessons" (
      "id" serial PRIMARY KEY NOT NULL,
      "path_id" integer NOT NULL REFERENCES "training_learning_paths"("id") ON DELETE CASCADE,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "status" "public"."enum_training_lessons_status" DEFAULT 'draft' NOT NULL,
      "sort_order" numeric DEFAULT 100 NOT NULL,
      "estimated_minutes" numeric DEFAULT 10,
      "practice_work_key" varchar,
      "work_stage" "public"."enum_training_lessons_work_stage" DEFAULT 'learn',
      "summary" varchar,
      "objective" varchar,
      "body" varchar,
      "knowledge_check_placeholder" varchar,
      "practice_task_placeholder" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "training_lessons_path_idx"
      ON "training_lessons" USING btree ("path_id");
    CREATE INDEX IF NOT EXISTS "training_lessons_slug_idx"
      ON "training_lessons" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "training_lessons_status_idx"
      ON "training_lessons" USING btree ("status");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "training_lessons_steps" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "detail" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "training_lessons_examples" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "training_lessons_common_mistakes" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "training_lessons_best_practices" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "training_lessons_checklist" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "item_id" varchar NOT NULL,
      "label" varchar NOT NULL,
      "required" boolean DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS "training_lessons_resources" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "href" varchar,
      "note" varchar
    );
    CREATE TABLE IF NOT EXISTS "training_lessons_images" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "url" varchar NOT NULL,
      "alt" varchar NOT NULL,
      "caption" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "training_learner_progress" (
      "id" serial PRIMARY KEY NOT NULL,
      "learner_key" varchar NOT NULL,
      "path_id" integer NOT NULL REFERENCES "training_learning_paths"("id") ON DELETE CASCADE,
      "lesson_id" integer NOT NULL REFERENCES "training_lessons"("id") ON DELETE CASCADE,
      "path_slug" varchar,
      "lesson_slug" varchar,
      "status" "public"."enum_training_learner_progress_status" DEFAULT 'not-started' NOT NULL,
      "percent_complete" numeric DEFAULT 0 NOT NULL,
      "time_spent_seconds" numeric DEFAULT 0,
      "started_at" timestamp(3) with time zone,
      "last_viewed_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "training_learner_progress_learner_key_idx"
      ON "training_learner_progress" USING btree ("learner_key");
    CREATE INDEX IF NOT EXISTS "training_learner_progress_lesson_idx"
      ON "training_learner_progress" USING btree ("lesson_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "training_learner_progress_learner_lesson_uidx"
      ON "training_learner_progress" USING btree ("learner_key", "lesson_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "training_learner_progress_checklist_state" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "training_learner_progress"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "item_id" varchar NOT NULL
    );
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "training_learning_paths_id" integer,
      ADD COLUMN IF NOT EXISTS "training_lessons_id" integer,
      ADD COLUMN IF NOT EXISTS "training_learner_progress_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "training_learning_paths_id",
      DROP COLUMN IF EXISTS "training_lessons_id",
      DROP COLUMN IF EXISTS "training_learner_progress_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "training_learner_progress_checklist_state" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_learner_progress" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons_images" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons_resources" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons_checklist" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons_best_practices" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons_common_mistakes" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons_examples" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons_steps" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_lessons" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "training_learning_paths" CASCADE;`);
}
