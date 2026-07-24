/**
 * Phase 38C — Staff help requests (Ask Matt).
 * Additive. Internal only — no external notifications.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_staff_help_requests_status'
      ) THEN
        CREATE TYPE "public"."enum_staff_help_requests_status" AS ENUM(
          'open',
          'answered',
          'resolved'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_help_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "work_id" integer,
      "client_id" integer,
      "question" varchar NOT NULL,
      "page_path" varchar NOT NULL,
      "status" "public"."enum_staff_help_requests_status" DEFAULT 'open' NOT NULL,
      "matt_response" varchar,
      "answered_at" timestamp(3) with time zone,
      "resolved_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_help_requests"
        ADD CONSTRAINT "staff_help_requests_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_help_requests"
        ADD CONSTRAINT "staff_help_requests_work_id_work_id_fk"
        FOREIGN KEY ("work_id") REFERENCES "public"."work"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_help_requests"
        ADD CONSTRAINT "staff_help_requests_client_id_clients_id_fk"
        FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_help_requests_staff_status_idx"
      ON "staff_help_requests" ("staff_user_id", "status");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_help_requests_status_created_idx"
      ON "staff_help_requests" ("status", "created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_help_requests" CASCADE;`);
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_staff_help_requests_status') THEN
        DROP TYPE "public"."enum_staff_help_requests_status";
      END IF;
    END $$;
  `);
}
