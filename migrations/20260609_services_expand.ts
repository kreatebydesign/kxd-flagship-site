import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Extend enum_services_category with new values ──────────────────────
  // PostgreSQL does not support IF NOT EXISTS for ADD VALUE, so we guard with
  // a DO block that checks pg_enum first.
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'brand-systems-identity'
          AND enumtypid = 'public.enum_services_category'::regtype
      ) THEN
        ALTER TYPE "public"."enum_services_category" ADD VALUE 'brand-systems-identity';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'ongoing-partnership'
          AND enumtypid = 'public.enum_services_category'::regtype
      ) THEN
        ALTER TYPE "public"."enum_services_category" ADD VALUE 'ongoing-partnership';
      END IF;
    END$$;
  `);

  // ── 2. New enum for engagement type ───────────────────────────────────────
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_services_engagement_type'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_services_engagement_type"
          AS ENUM('project', 'retainer', 'hybrid', 'enterprise');
      END IF;
    END$$;
  `);

  // ── 3. New columns on the services table ──────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "public"."services"
      ADD COLUMN IF NOT EXISTS "eyebrow"               varchar,
      ADD COLUMN IF NOT EXISTS "investment_label"      varchar DEFAULT 'Custom Investment',
      ADD COLUMN IF NOT EXISTS "investment_range"      varchar,
      ADD COLUMN IF NOT EXISTS "timeline_label"        varchar,
      ADD COLUMN IF NOT EXISTS "engagement_type"       "public"."enum_services_engagement_type" DEFAULT 'project',
      ADD COLUMN IF NOT EXISTS "cta_label"             varchar DEFAULT 'Start the Conversation',
      ADD COLUMN IF NOT EXISTS "cta_href"              varchar DEFAULT '/contact',
      ADD COLUMN IF NOT EXISTS "secondary_cta_label"   varchar,
      ADD COLUMN IF NOT EXISTS "secondary_cta_href"    varchar;
  `);

  // ── 4. New array tables ────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "services_best_for" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "item"        varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "services_outcomes" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "item"        varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "services_process" (
      "_order"           integer NOT NULL,
      "_parent_id"       integer NOT NULL,
      "id"               varchar PRIMARY KEY NOT NULL,
      "step_title"       varchar NOT NULL,
      "step_description" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "services_faqs" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "question"    varchar NOT NULL,
      "answer"      varchar NOT NULL
    );
  `);

  // ── 5. Foreign keys ────────────────────────────────────────────────────────
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'services_best_for_parent_id_fk'
      ) THEN
        ALTER TABLE "services_best_for"
          ADD CONSTRAINT "services_best_for_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'services_outcomes_parent_id_fk'
      ) THEN
        ALTER TABLE "services_outcomes"
          ADD CONSTRAINT "services_outcomes_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'services_process_parent_id_fk'
      ) THEN
        ALTER TABLE "services_process"
          ADD CONSTRAINT "services_process_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'services_faqs_parent_id_fk'
      ) THEN
        ALTER TABLE "services_faqs"
          ADD CONSTRAINT "services_faqs_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END$$;
  `);

  // ── 6. Indexes ─────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "services_best_for_order_idx"
      ON "services_best_for" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "services_best_for_parent_id_idx"
      ON "services_best_for" USING btree ("_parent_id");

    CREATE INDEX IF NOT EXISTS "services_outcomes_order_idx"
      ON "services_outcomes" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "services_outcomes_parent_id_idx"
      ON "services_outcomes" USING btree ("_parent_id");

    CREATE INDEX IF NOT EXISTS "services_process_order_idx"
      ON "services_process" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "services_process_parent_id_idx"
      ON "services_process" USING btree ("_parent_id");

    CREATE INDEX IF NOT EXISTS "services_faqs_order_idx"
      ON "services_faqs" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "services_faqs_parent_id_idx"
      ON "services_faqs" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "services_best_for"  CASCADE;
    DROP TABLE IF EXISTS "services_outcomes"  CASCADE;
    DROP TABLE IF EXISTS "services_process"   CASCADE;
    DROP TABLE IF EXISTS "services_faqs"      CASCADE;

    ALTER TABLE "public"."services"
      DROP COLUMN IF EXISTS "eyebrow",
      DROP COLUMN IF EXISTS "investment_label",
      DROP COLUMN IF EXISTS "investment_range",
      DROP COLUMN IF EXISTS "timeline_label",
      DROP COLUMN IF EXISTS "engagement_type",
      DROP COLUMN IF EXISTS "cta_label",
      DROP COLUMN IF EXISTS "cta_href",
      DROP COLUMN IF EXISTS "secondary_cta_label",
      DROP COLUMN IF EXISTS "secondary_cta_href";

    DROP TYPE IF EXISTS "public"."enum_services_engagement_type";
    -- Note: enum values added to enum_services_category cannot be removed in PostgreSQL.
  `);
}
