/**
 * Phase 34A — Durable Client Launch Wizard drafts.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_launch_drafts" (
      "id" serial PRIMARY KEY,
      "business_name" varchar,
      "client_slug" varchar,
      "status" varchar DEFAULT 'draft' NOT NULL,
      "current_step" varchar DEFAULT 'identity' NOT NULL,
      "payload" jsonb NOT NULL,
      "validation_issues" jsonb,
      "launch_operation_id" varchar,
      "launched_client_id" integer,
      "failure_summary" varchar,
      "created_by" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_launch_drafts_launch_operation_id_idx"
      ON "client_launch_drafts" ("launch_operation_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_launch_drafts_client_slug_idx"
      ON "client_launch_drafts" ("client_slug");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_launch_drafts_status_idx"
      ON "client_launch_drafts" ("status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_launch_drafts_business_name_idx"
      ON "client_launch_drafts" ("business_name");
  `);

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'client_launch_drafts_launched_client_id_fk'
        ) THEN
          ALTER TABLE "client_launch_drafts"
            ADD CONSTRAINT "client_launch_drafts_launched_client_id_fk"
            FOREIGN KEY ("launched_client_id") REFERENCES "clients"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal on exotic local schemas */
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "client_launch_drafts";
  `);
}
