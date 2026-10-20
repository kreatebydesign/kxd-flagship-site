/**
 * Release B Phase 1 — signing modes, dual-signature evidence, execution states.
 * Additive columns on Release A tables. Apply per Matt's release process (not auto-production).
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "staff_document_templates"
      ADD COLUMN IF NOT EXISTS "signing_mode" varchar NOT NULL DEFAULT 'acknowledgment';
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents"
      ADD COLUMN IF NOT EXISTS "signing_mode" varchar NOT NULL DEFAULT 'acknowledgment';
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents"
      ADD COLUMN IF NOT EXISTS "employee_signature" jsonb;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents"
      ADD COLUMN IF NOT EXISTS "operator_signature" jsonb;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents"
      ADD COLUMN IF NOT EXISTS "executed_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents"
      ADD COLUMN IF NOT EXISTS "expires_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents"
      ADD COLUMN IF NOT EXISTS "declined_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents"
      ADD COLUMN IF NOT EXISTS "decline_reason" varchar;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_documents_status_signing_mode_idx"
      ON "staff_documents" ("status", "signing_mode");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "staff_documents_status_signing_mode_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "staff_documents" DROP COLUMN IF EXISTS "decline_reason";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_documents" DROP COLUMN IF EXISTS "declined_at";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_documents" DROP COLUMN IF EXISTS "expires_at";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_documents" DROP COLUMN IF EXISTS "executed_at";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_documents" DROP COLUMN IF EXISTS "operator_signature";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_documents" DROP COLUMN IF EXISTS "employee_signature";
  `);
  await db.execute(sql`
    ALTER TABLE "staff_documents" DROP COLUMN IF EXISTS "signing_mode";
  `);

  await db.execute(sql`
    ALTER TABLE "staff_document_templates" DROP COLUMN IF EXISTS "signing_mode";
  `);
}
