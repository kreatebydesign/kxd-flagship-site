/**
 * Junior Creator Assigned Tasks — 2026-08-03
 * Separate from Academy missions. Scoped to junior-creator-users.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_junior_creator_tasks_priority'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_junior_creator_tasks_priority"
          AS ENUM('high', 'medium', 'low');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_junior_creator_tasks_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_junior_creator_tasks_status"
          AS ENUM(
            'assigned',
            'in_progress',
            'ready_for_review',
            'completed',
            'blocked',
            'cancelled'
          );
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "junior_creator_tasks" (
      "id"                        serial PRIMARY KEY NOT NULL,
      "title"                     varchar NOT NULL,
      "instructions"              varchar NOT NULL,
      "client_label"              varchar NOT NULL,
      "junior_creator_user_id"    integer NOT NULL,
      "priority"                  "public"."enum_junior_creator_tasks_priority"
                                    DEFAULT 'medium' NOT NULL,
      "estimated_minutes"         numeric NOT NULL,
      "due_at"                    timestamp(3) with time zone,
      "status"                    "public"."enum_junior_creator_tasks_status"
                                    DEFAULT 'assigned' NOT NULL,
      "completion_notes"          varchar,
      "related_link"              varchar,
      "seed_key"                  varchar,
      "archived"                  boolean DEFAULT false,
      "updated_at"                timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"                timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'junior_creator_tasks_junior_creator_user_id_fk'
          AND table_name = 'junior_creator_tasks'
      ) THEN
        ALTER TABLE "junior_creator_tasks"
          ADD CONSTRAINT "junior_creator_tasks_junior_creator_user_id_fk"
          FOREIGN KEY ("junior_creator_user_id")
          REFERENCES "public"."junior_creator_users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "junior_creator_tasks_junior_creator_user_id_idx"
      ON "junior_creator_tasks" USING btree ("junior_creator_user_id");
    CREATE INDEX IF NOT EXISTS "junior_creator_tasks_status_idx"
      ON "junior_creator_tasks" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "junior_creator_tasks_archived_idx"
      ON "junior_creator_tasks" USING btree ("archived");
    CREATE UNIQUE INDEX IF NOT EXISTS "junior_creator_tasks_seed_key_idx"
      ON "junior_creator_tasks" USING btree ("seed_key")
      WHERE "seed_key" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "junior_creator_tasks_seed_key_idx";
    DROP INDEX IF EXISTS "junior_creator_tasks_archived_idx";
    DROP INDEX IF EXISTS "junior_creator_tasks_status_idx";
    DROP INDEX IF EXISTS "junior_creator_tasks_junior_creator_user_id_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "junior_creator_tasks"
      DROP CONSTRAINT IF EXISTS "junior_creator_tasks_junior_creator_user_id_fk";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "junior_creator_tasks" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_junior_creator_tasks_status";
    DROP TYPE IF EXISTS "public"."enum_junior_creator_tasks_priority";
  `);
}
