import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/**
 * Direct Agreement workflow — additive contract + commercial-document fields.
 * Do not apply to production until authorized.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contracts"
    ADD COLUMN IF NOT EXISTS "service_end_date" timestamptz,
    ADD COLUMN IF NOT EXISTS "agreement_source" varchar DEFAULT 'proposal',
    ADD COLUMN IF NOT EXISTS "direct_agreement_terms" jsonb;
  `);

  await db.execute(sql`
    ALTER TABLE "commercial_documents"
    ADD COLUMN IF NOT EXISTS "storage_provider" varchar DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS "sent_at" timestamptz,
    ADD COLUMN IF NOT EXISTS "accepted_at" timestamptz;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "commercial_documents_client_idx"
    ON "commercial_documents" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "contracts_agreement_source_idx"
    ON "contracts" ("agreement_source");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contracts"
    DROP COLUMN IF EXISTS "service_end_date",
    DROP COLUMN IF EXISTS "agreement_source",
    DROP COLUMN IF EXISTS "direct_agreement_terms";
  `);
  await db.execute(sql`
    ALTER TABLE "commercial_documents"
    DROP COLUMN IF EXISTS "storage_provider",
    DROP COLUMN IF EXISTS "sent_at",
    DROP COLUMN IF EXISTS "accepted_at";
  `);
}
