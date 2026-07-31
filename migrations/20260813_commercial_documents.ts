import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/**
 * Private commercial document registry + signing token hash column on contracts.
 * Local DB only — never apply to Neon/production in this phase.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contracts"
    ADD COLUMN IF NOT EXISTS "signing_token_hash" varchar;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "commercial_documents" (
      "id" serial PRIMARY KEY,
      "title" varchar NOT NULL,
      "kind" varchar NOT NULL,
      "proposal_id" integer,
      "contract_id" integer NOT NULL,
      "client_id" integer,
      "version" numeric NOT NULL DEFAULT 1,
      "content_hash" varchar NOT NULL,
      "storage_key" varchar NOT NULL,
      "mime_type" varchar NOT NULL DEFAULT 'application/pdf',
      "byte_length" numeric,
      "source_snapshot_ref" varchar,
      "lineage_parent_id" integer,
      "execution_status" varchar DEFAULT 'draft',
      "generated_at" timestamptz NOT NULL,
      "party_names" jsonb,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "commercial_documents_content_hash_idx"
    ON "commercial_documents" ("content_hash");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "commercial_documents_contract_idx"
    ON "commercial_documents" ("contract_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "contracts_signing_token_hash_idx"
    ON "contracts" ("signing_token_hash");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "commercial_documents";`);
  await db.execute(sql`
    ALTER TABLE "contracts" DROP COLUMN IF EXISTS "signing_token_hash";
  `);
}
