import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Create tier enum ────────────────────────────────────────────────────
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_projects_tier'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_projects_tier"
          AS ENUM('primary', 'secondary');
      END IF;
    END$$;
  `);

  // ── 2. Drop NOT NULL constraint from hero_image_id (making image optional) ─
  await db.execute(sql`
    ALTER TABLE "public"."projects"
      ALTER COLUMN "hero_image_id" DROP NOT NULL;
  `);

  // ── 3. New columns on the projects table ──────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "public"."projects"
      ADD COLUMN IF NOT EXISTS "tagline"        varchar,
      ADD COLUMN IF NOT EXISTS "context"        varchar,
      ADD COLUMN IF NOT EXISTS "challenge"      varchar,
      ADD COLUMN IF NOT EXISTS "strategy"       varchar,
      ADD COLUMN IF NOT EXISTS "why_it_worked"  varchar,
      ADD COLUMN IF NOT EXISTS "tier"           "public"."enum_projects_tier" DEFAULT 'secondary',
      ADD COLUMN IF NOT EXISTS "service"        varchar,
      ADD COLUMN IF NOT EXISTS "outcome"        varchar,
      ADD COLUMN IF NOT EXISTS "description"    varchar,
      ADD COLUMN IF NOT EXISTS "order"          numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "image_position" varchar,
      ADD COLUMN IF NOT EXISTS "image_contain"  boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "logo_url"       varchar;
  `);

  // ── 4. New array tables ────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "projects_scope" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "item"        varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "projects_execution" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "item"        varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "projects_outcomes" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "item"        varchar NOT NULL
    );
  `);

  // ── 5. Foreign keys ────────────────────────────────────────────────────────
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'projects_scope_parent_id_fk'
      ) THEN
        ALTER TABLE "projects_scope"
          ADD CONSTRAINT "projects_scope_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'projects_execution_parent_id_fk'
      ) THEN
        ALTER TABLE "projects_execution"
          ADD CONSTRAINT "projects_execution_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'projects_outcomes_parent_id_fk'
      ) THEN
        ALTER TABLE "projects_outcomes"
          ADD CONSTRAINT "projects_outcomes_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END$$;
  `);

  // ── 6. Indexes ─────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "projects_scope_order_idx"
      ON "projects_scope" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "projects_scope_parent_id_idx"
      ON "projects_scope" USING btree ("_parent_id");

    CREATE INDEX IF NOT EXISTS "projects_execution_order_idx"
      ON "projects_execution" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "projects_execution_parent_id_idx"
      ON "projects_execution" USING btree ("_parent_id");

    CREATE INDEX IF NOT EXISTS "projects_outcomes_order_idx"
      ON "projects_outcomes" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "projects_outcomes_parent_id_idx"
      ON "projects_outcomes" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "projects_scope"     CASCADE;
    DROP TABLE IF EXISTS "projects_execution" CASCADE;
    DROP TABLE IF EXISTS "projects_outcomes"  CASCADE;

    ALTER TABLE "public"."projects"
      DROP COLUMN IF EXISTS "tagline",
      DROP COLUMN IF EXISTS "context",
      DROP COLUMN IF EXISTS "challenge",
      DROP COLUMN IF EXISTS "strategy",
      DROP COLUMN IF EXISTS "why_it_worked",
      DROP COLUMN IF EXISTS "tier",
      DROP COLUMN IF EXISTS "service",
      DROP COLUMN IF EXISTS "outcome",
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "order",
      DROP COLUMN IF EXISTS "image_position",
      DROP COLUMN IF EXISTS "image_contain",
      DROP COLUMN IF EXISTS "logo_url";

    DROP TYPE IF EXISTS "public"."enum_projects_tier";
  `);
}
