/**
 * KXD Core Phase 7A — KXD Brain memory
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_brain_memory_action') THEN
        CREATE TYPE "public"."enum_brain_memory_action"
          AS ENUM('shown','dismissed','completed','ignored');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "brain_memory" (
      "id" serial PRIMARY KEY NOT NULL,
      "recommendation_id" varchar NOT NULL,
      "action" "public"."enum_brain_memory_action" NOT NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "title" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "brain_memory_rec_idx" ON "brain_memory" ("recommendation_id");
    CREATE INDEX IF NOT EXISTS "brain_memory_action_idx" ON "brain_memory" ("action");
    CREATE INDEX IF NOT EXISTS "brain_memory_created_idx" ON "brain_memory" ("created_at" DESC);
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "brain_memory_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "brain_memory_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "brain_memory" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_brain_memory_action";`);
}
