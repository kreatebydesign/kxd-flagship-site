/**
 * Phase 17 M2 — project inquiry intake attribution (additive, backward compatible).
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "project_inquiries"
      ADD COLUMN IF NOT EXISTS "inquiry_source" varchar,
      ADD COLUMN IF NOT EXISTS "intake_channel" varchar,
      ADD COLUMN IF NOT EXISTS "source_website_audit_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'project_inquiries_source_website_audit_id_fk'
      ) THEN
        ALTER TABLE "project_inquiries"
          ADD CONSTRAINT "project_inquiries_source_website_audit_id_fk"
          FOREIGN KEY ("source_website_audit_id") REFERENCES "public"."website_audits"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "project_inquiries"
      DROP CONSTRAINT IF EXISTS "project_inquiries_source_website_audit_id_fk";
  `);
  await db.execute(sql`
    ALTER TABLE "project_inquiries"
      DROP COLUMN IF EXISTS "source_website_audit_id",
      DROP COLUMN IF EXISTS "intake_channel",
      DROP COLUMN IF EXISTS "inquiry_source";
  `);
}
