/**
 * Phase 38B — Daily Staff Plan: recurring responsibilities + wrap-up notes.
 * Additive. Does not invent assignments or modify users.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_staff_responsibilities_cadence'
      ) THEN
        CREATE TYPE "public"."enum_staff_responsibilities_cadence" AS ENUM(
          'daily',
          'weekdays',
          'weekly',
          'monthly'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_staff_responsibilities_scope'
      ) THEN
        CREATE TYPE "public"."enum_staff_responsibilities_scope" AS ENUM(
          'internal',
          'client'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_responsibilities" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "purpose" varchar NOT NULL,
      "expected_outcome" varchar NOT NULL,
      "estimated_minutes" numeric,
      "owner_id" integer,
      "cadence" "public"."enum_staff_responsibilities_cadence" DEFAULT 'daily' NOT NULL,
      "scope" "public"."enum_staff_responsibilities_scope" DEFAULT 'internal' NOT NULL,
      "client_id" integer,
      "requires_approval" boolean DEFAULT false,
      "active" boolean DEFAULT true,
      "library_key" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_responsibilities_weekday_mask" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "day" numeric NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_responsibilities"
        ADD CONSTRAINT "staff_responsibilities_owner_id_users_id_fk"
        FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_responsibilities"
        ADD CONSTRAINT "staff_responsibilities_client_id_clients_id_fk"
        FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_responsibilities_weekday_mask"
        ADD CONSTRAINT "staff_responsibilities_weekday_mask_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."staff_responsibilities"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_day_wrapups" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "date_key" varchar NOT NULL,
      "note_for_matt" varchar,
      "snapshot_json" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_day_wrapups"
        ADD CONSTRAINT "staff_day_wrapups_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_day_wrapups_user_date_idx"
      ON "staff_day_wrapups" ("staff_user_id", "date_key");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_day_wrapups" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_responsibilities_weekday_mask" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_responsibilities" CASCADE;`);
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_staff_responsibilities_cadence') THEN
        DROP TYPE "public"."enum_staff_responsibilities_cadence";
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_staff_responsibilities_scope') THEN
        DROP TYPE "public"."enum_staff_responsibilities_scope";
      END IF;
    END $$;
  `);
}
