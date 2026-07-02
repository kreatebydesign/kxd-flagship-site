/**
 * KXD OS Phase 9C — Proposal Conversion Engine + Contracts
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_conversions_status') THEN
        CREATE TYPE "public"."enum_proposal_conversions_status"
          AS ENUM('pending', 'in-progress', 'completed', 'failed');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_conversions_conversion_mode') THEN
        CREATE TYPE "public"."enum_proposal_conversions_conversion_mode"
          AS ENUM('new-client', 'existing-client', 'project-expansion', 'retainer-only', 'one-time', 'hybrid');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_conversions_launch_status') THEN
        CREATE TYPE "public"."enum_proposal_conversions_launch_status"
          AS ENUM('queued', 'in-progress', 'completed');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_contract_templates_contract_type') THEN
        CREATE TYPE "public"."enum_contract_templates_contract_type"
          AS ENUM('service-agreement', 'monthly-retainer', 'website-agreement', 'marketing-retainer', 'crm-agreement', 'consulting', 'custom');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_contracts_status') THEN
        CREATE TYPE "public"."enum_contracts_status"
          AS ENUM('draft', 'sent', 'viewed', 'signed', 'declined', 'expired', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_contracts_contract_type') THEN
        CREATE TYPE "public"."enum_contracts_contract_type"
          AS ENUM('service-agreement', 'monthly-retainer', 'website-agreement', 'marketing-retainer', 'crm-agreement', 'consulting', 'custom');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_contract_activity_event_type') THEN
        CREATE TYPE "public"."enum_contract_activity_event_type"
          AS ENUM('contract.created', 'contract.sent', 'contract.viewed', 'contract.signed', 'contract.declined', 'contract.expired', 'contract.archived');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposal_activity_event_type" ADD VALUE 'proposal.converted';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "contract_templates" (
      "id" serial PRIMARY KEY NOT NULL,
      "contract_type" "public"."enum_contract_templates_contract_type" DEFAULT 'service-agreement' NOT NULL,
      "active" boolean DEFAULT true,
      "sort_order" numeric DEFAULT 0,
      "title" varchar NOT NULL,
      "slug" varchar,
      "description" varchar,
      "body" varchar NOT NULL,
      "terms" varchar,
      "merge_fields" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "contracts" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "proposal_id" integer REFERENCES "proposals"("id") ON DELETE SET NULL,
      "template_id" integer REFERENCES "contract_templates"("id") ON DELETE SET NULL,
      "status" "public"."enum_contracts_status" DEFAULT 'draft' NOT NULL,
      "contract_type" "public"."enum_contracts_contract_type" DEFAULT 'service-agreement' NOT NULL,
      "title" varchar NOT NULL,
      "public_title" varchar,
      "body" varchar,
      "terms" varchar,
      "executive_notes" varchar,
      "monthly_amount" numeric,
      "project_amount" numeric,
      "start_date" timestamp(3) with time zone,
      "sent_at" timestamp(3) with time zone,
      "viewed_at" timestamp(3) with time zone,
      "signed_at" timestamp(3) with time zone,
      "expires_at" timestamp(3) with time zone,
      "public_token" varchar,
      "signer_name" varchar,
      "signer_email" varchar,
      "signer_title" varchar,
      "esign_provider" varchar,
      "esign_envelope_id" varchar,
      "related_project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_retainer_id" integer REFERENCES "retainers"("id") ON DELETE SET NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposal_conversions" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_id" integer NOT NULL UNIQUE REFERENCES "proposals"("id") ON DELETE CASCADE,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "status" "public"."enum_proposal_conversions_status" DEFAULT 'pending' NOT NULL,
      "conversion_mode" "public"."enum_proposal_conversions_conversion_mode" DEFAULT 'hybrid',
      "title" varchar NOT NULL,
      "summary" varchar,
      "converted_at" timestamp(3) with time zone,
      "related_project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_retainer_id" integer REFERENCES "retainers"("id") ON DELETE SET NULL,
      "related_contract_id" integer REFERENCES "contracts"("id") ON DELETE SET NULL,
      "related_onboarding_id" integer REFERENCES "client_onboarding"("id") ON DELETE SET NULL,
      "launch_status" "public"."enum_proposal_conversions_launch_status" DEFAULT 'queued',
      "result" jsonb,
      "error_log" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "contract_activity" (
      "id" serial PRIMARY KEY NOT NULL,
      "contract_id" integer NOT NULL REFERENCES "contracts"("id") ON DELETE CASCADE,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "event_type" "public"."enum_contract_activity_event_type" NOT NULL,
      "title" varchar NOT NULL,
      "summary" varchar,
      "actor" varchar,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "contracts_public_token_idx" ON "contracts" USING btree ("public_token");
    CREATE INDEX IF NOT EXISTS "contracts_client_idx" ON "contracts" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "contracts_proposal_idx" ON "contracts" USING btree ("proposal_id");
    CREATE INDEX IF NOT EXISTS "contracts_status_idx" ON "contracts" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "contract_templates_contract_type_idx" ON "contract_templates" USING btree ("contract_type");
    CREATE INDEX IF NOT EXISTS "proposal_conversions_client_idx" ON "proposal_conversions" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "proposal_conversions_status_idx" ON "proposal_conversions" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "contract_activity_contract_idx" ON "contract_activity" USING btree ("contract_id");
    CREATE INDEX IF NOT EXISTS "contract_activity_client_idx" ON "contract_activity" USING btree ("client_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "contract_activity" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "proposal_conversions" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "contracts" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "contract_templates" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_contract_activity_event_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_contracts_contract_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_contracts_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_contract_templates_contract_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposal_conversions_launch_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposal_conversions_conversion_mode";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposal_conversions_status";`);
}
