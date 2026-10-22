/**
 * Staff document template operator workflow — provenance, versioning, legal review metadata.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      ADD COLUMN IF NOT EXISTS "is_sample" boolean NOT NULL DEFAULT false;
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      ADD COLUMN IF NOT EXISTS "family_key" varchar;
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      ADD COLUMN IF NOT EXISTS "created_by" varchar;
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      ADD COLUMN IF NOT EXISTS "legal_review_submitted_at" timestamp(3) with time zone;
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      ADD COLUMN IF NOT EXISTS "legal_review_submitted_by" varchar;
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      ADD COLUMN IF NOT EXISTS "supersedes_template_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_document_templates"
        ADD CONSTRAINT "staff_document_templates_supersedes_template_id_fk"
        FOREIGN KEY ("supersedes_template_id") REFERENCES "public"."staff_document_templates"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_document_templates_family_key_idx"
      ON "staff_document_templates" ("family_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_document_templates_is_sample_idx"
      ON "staff_document_templates" ("is_sample");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "staff_document_templates_is_sample_idx";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "staff_document_templates_family_key_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      DROP CONSTRAINT IF EXISTS "staff_document_templates_supersedes_template_id_fk";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates" DROP COLUMN IF EXISTS "supersedes_template_id";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates" DROP COLUMN IF EXISTS "legal_review_submitted_by";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates" DROP COLUMN IF EXISTS "legal_review_submitted_at";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates" DROP COLUMN IF EXISTS "created_by";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates" DROP COLUMN IF EXISTS "family_key";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_document_templates" DROP COLUMN IF EXISTS "is_sample";
  `);
}
