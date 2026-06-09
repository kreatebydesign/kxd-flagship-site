import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Enum types ──────────────────────────────────────────────────────────
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_project_inquiries_investment_range'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_project_inquiries_investment_range"
          AS ENUM('under-10k', '10k-25k', '25k-50k', '50k-100k', '100k-plus', 'not-determined');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_project_inquiries_timeline'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_project_inquiries_timeline"
          AS ENUM('immediate', 'within-30-days', '60-90-days', '3-6-months', 'exploring');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_project_inquiries_status'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_project_inquiries_status"
          AS ENUM('new', 'reviewing', 'discovery', 'proposal', 'active', 'closed');
      END IF;
    END$$;
  `);

  // ── 2. Create project_inquiries table ─────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "project_inquiries" (
      "id"                   serial PRIMARY KEY NOT NULL,
      "company_name"         varchar NOT NULL,
      "website_url"          varchar,
      "contact_name"         varchar NOT NULL,
      "email"                varchar NOT NULL,
      "phone"                varchar,
      "services_interested"  varchar,
      "business_goals"       varchar,
      "investment_range"     "public"."enum_project_inquiries_investment_range",
      "timeline"             "public"."enum_project_inquiries_timeline",
      "assets_available"     varchar,
      "notes"                varchar,
      "status"               "public"."enum_project_inquiries_status" DEFAULT 'new' NOT NULL,
      "submitted_at"         timestamp(3) with time zone,
      "updated_at"           timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"           timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  // ── 3. Indexes ─────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "project_inquiries_status_idx"
      ON "project_inquiries" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "project_inquiries_created_at_idx"
      ON "project_inquiries" USING btree ("created_at" DESC);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "project_inquiries" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_project_inquiries_status";
    DROP TYPE IF EXISTS "public"."enum_project_inquiries_timeline";
    DROP TYPE IF EXISTS "public"."enum_project_inquiries_investment_range";
  `);
}
