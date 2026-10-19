/**
 * Phase 2A — Staff client notes (My Clients internal notes / questions).
 * Additive. Internal only.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_staff_client_notes_kind'
      ) THEN
        CREATE TYPE "public"."enum_staff_client_notes_kind" AS ENUM('note', 'question');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_client_notes" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL,
      "author_user_id" integer NOT NULL,
      "author_display_name" varchar NOT NULL,
      "kind" "public"."enum_staff_client_notes_kind" DEFAULT 'note' NOT NULL,
      "body" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_client_notes"
        ADD CONSTRAINT "staff_client_notes_client_id_clients_id_fk"
        FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_client_notes"
        ADD CONSTRAINT "staff_client_notes_author_user_id_users_id_fk"
        FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_client_notes_client_created_idx"
      ON "staff_client_notes" ("client_id", "created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_client_notes" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_staff_client_notes_kind";`);
}
