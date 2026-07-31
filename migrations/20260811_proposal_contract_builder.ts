/**
 * Additive Proposal Builder → Contract Draft fields.
 * Local-safe. Does not mutate Neon/production from this task.
 * Preserves existing proposal/agreement/commercial records.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposals_status" ADD VALUE 'approved-for-sharing';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposals_status" ADD VALUE 'accepted-contract-pending';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_contracts_status" ADD VALUE 'internal-review';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_contracts_status" ADD VALUE 'approved-for-signature';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_contracts_status" ADD VALUE 'sent-for-signature';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_contracts_status" ADD VALUE 'partially-signed';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_contracts_status" ADD VALUE 'executed';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_contracts_status" ADD VALUE 'voided';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_contracts_status" ADD VALUE 'superseded';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_proposals_acceptance_mode'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_proposals_acceptance_mode" AS ENUM (
          'accept-and-proceed-to-contract',
          'binding-proposal-future'
        );
      END IF;
    END$$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_proposal_templates_template_kind'
          AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_proposal_templates_template_kind" AS ENUM (
          'website-design-development',
          'monthly-website-management',
          'marketing-advertising-management',
          'combined-project-retainer',
          'sponsorship-trade-partnership',
          'custom-professional-services'
        );
      END IF;
    END$$;
  `);

  await db.execute(sql`
    ALTER TABLE "proposals"
      ADD COLUMN IF NOT EXISTS "acceptance_mode" "public"."enum_proposals_acceptance_mode"
        DEFAULT 'accept-and-proceed-to-contract',
      ADD COLUMN IF NOT EXISTS "proposal_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "internal_owner" varchar,
      ADD COLUMN IF NOT EXISTS "schedule_call_url" varchar,
      ADD COLUMN IF NOT EXISTS "related_contract_id" integer,
      ADD COLUMN IF NOT EXISTS "share_approved_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "share_approved_by" varchar,
      ADD COLUMN IF NOT EXISTS "accepted_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "builder_document" jsonb,
      ADD COLUMN IF NOT EXISTS "version_history" jsonb,
      ADD COLUMN IF NOT EXISTS "share_snapshot" jsonb,
      ADD COLUMN IF NOT EXISTS "accepted_snapshot" jsonb,
      ADD COLUMN IF NOT EXISTS "acceptance_record" jsonb,
      ADD COLUMN IF NOT EXISTS "share_links" jsonb,
      ADD COLUMN IF NOT EXISTS "change_requests" jsonb,
      ADD COLUMN IF NOT EXISTS "public_token_hash" varchar,
      ADD COLUMN IF NOT EXISTS "public_token_prefix" varchar;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'proposals_related_contract_id_contracts_id_fk'
      ) THEN
        ALTER TABLE "proposals"
          ADD CONSTRAINT "proposals_related_contract_id_contracts_id_fk"
          FOREIGN KEY ("related_contract_id") REFERENCES "contracts"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "proposals_related_contract_idx"
      ON "proposals" USING btree ("related_contract_id");
    CREATE INDEX IF NOT EXISTS "proposals_public_token_hash_idx"
      ON "proposals" USING btree ("public_token_hash");
    CREATE INDEX IF NOT EXISTS "proposals_accepted_at_idx"
      ON "proposals" USING btree ("accepted_at");
  `);

  await db.execute(sql`
    UPDATE "proposals"
    SET "acceptance_mode" = 'accept-and-proceed-to-contract'
    WHERE "acceptance_mode" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "contracts"
      ADD COLUMN IF NOT EXISTS "contract_draft_snapshot" jsonb,
      ADD COLUMN IF NOT EXISTS "legal_provisions" jsonb,
      ADD COLUMN IF NOT EXISTS "executed_snapshot" jsonb;
  `);

  await db.execute(sql`
    ALTER TABLE "proposal_templates"
      ADD COLUMN IF NOT EXISTS "template_kind" "public"."enum_proposal_templates_template_kind",
      ADD COLUMN IF NOT EXISTS "builder_document" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "proposals"
      DROP COLUMN IF EXISTS "acceptance_mode",
      DROP COLUMN IF EXISTS "proposal_date",
      DROP COLUMN IF EXISTS "internal_owner",
      DROP COLUMN IF EXISTS "schedule_call_url",
      DROP COLUMN IF EXISTS "related_contract_id",
      DROP COLUMN IF EXISTS "share_approved_at",
      DROP COLUMN IF EXISTS "share_approved_by",
      DROP COLUMN IF EXISTS "accepted_at",
      DROP COLUMN IF EXISTS "builder_document",
      DROP COLUMN IF EXISTS "version_history",
      DROP COLUMN IF EXISTS "share_snapshot",
      DROP COLUMN IF EXISTS "accepted_snapshot",
      DROP COLUMN IF EXISTS "acceptance_record",
      DROP COLUMN IF EXISTS "share_links",
      DROP COLUMN IF EXISTS "change_requests",
      DROP COLUMN IF EXISTS "public_token_hash",
      DROP COLUMN IF EXISTS "public_token_prefix";
  `);

  await db.execute(sql`
    ALTER TABLE "contracts"
      DROP COLUMN IF EXISTS "contract_draft_snapshot",
      DROP COLUMN IF EXISTS "legal_provisions",
      DROP COLUMN IF EXISTS "executed_snapshot";
  `);

  await db.execute(sql`
    ALTER TABLE "proposal_templates"
      DROP COLUMN IF EXISTS "template_kind",
      DROP COLUMN IF EXISTS "builder_document";
  `);
}
