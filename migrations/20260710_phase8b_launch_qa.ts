/**
 * KXD Core Phase 8B — Website QA & Launch Readiness Center
 * website_qa_checks
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_website_qa_checks_status') THEN
        CREATE TYPE "public"."enum_website_qa_checks_status"
          AS ENUM('draft', 'in-progress', 'blocked', 'ready', 'approved', 'launched', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_website_qa_checks_recommendation') THEN
        CREATE TYPE "public"."enum_website_qa_checks_recommendation"
          AS ENUM('not-ready', 'needs-review', 'ready-to-launch', 'approved');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "website_qa_checks" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "website_url" varchar,
      "status" "public"."enum_website_qa_checks_status" DEFAULT 'draft' NOT NULL,
      "launch_date" timestamp(3) with time zone,
      "readiness_score" numeric DEFAULT 0,
      "recommendation" "public"."enum_website_qa_checks_recommendation" DEFAULT 'not-ready',
      "checked_by" varchar,
      "approved_by" varchar,
      "completed_at" timestamp(3) with time zone,
      "approved_at" timestamp(3) with time zone,
      "notes" varchar,
      "categories" jsonb,
      "checklist_items" jsonb NOT NULL,
      "blockers" jsonb,
      "warnings" jsonb,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "website_qa_checks_client_idx" ON "website_qa_checks" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "website_qa_checks_project_idx" ON "website_qa_checks" USING btree ("project_id");
    CREATE INDEX IF NOT EXISTS "website_qa_checks_status_idx" ON "website_qa_checks" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "website_qa_checks_launch_date_idx" ON "website_qa_checks" USING btree ("launch_date");
    CREATE INDEX IF NOT EXISTS "website_qa_checks_readiness_score_idx" ON "website_qa_checks" USING btree ("readiness_score");
    CREATE INDEX IF NOT EXISTS "website_qa_checks_updated_at_idx" ON "website_qa_checks" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "website_qa_checks_created_at_idx" ON "website_qa_checks" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "website_qa_checks" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_website_qa_checks_recommendation";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_website_qa_checks_status";`);
}
