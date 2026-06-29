/**
 * KXD OS Phase 9A — Executive Proposal & Estimate Engine
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_templates_proposal_type') THEN
        CREATE TYPE "public"."enum_proposal_templates_proposal_type"
          AS ENUM(
            'website', 'branding', 'marketing-retainer', 'crm-automation',
            'consulting', 'one-time-project', 'monthly-retainer', 'custom'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estimate_items_item_type') THEN
        CREATE TYPE "public"."enum_estimate_items_item_type"
          AS ENUM('fixed', 'hourly', 'monthly-retainer', 'quantity', 'optional-upgrade');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_approvals_action') THEN
        CREATE TYPE "public"."enum_proposal_approvals_action"
          AS ENUM(
            'approved', 'declined', 'revision-requested', 'questions',
            'internal-approved', 'sent-for-review'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposal_activity_event_type') THEN
        CREATE TYPE "public"."enum_proposal_activity_event_type"
          AS ENUM(
            'proposal.created', 'proposal.internal-review', 'proposal.sent',
            'proposal.viewed', 'proposal.question', 'proposal.revised',
            'proposal.approved', 'proposal.declined', 'proposal.expired', 'proposal.archived'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposals_proposal_type') THEN
        CREATE TYPE "public"."enum_proposals_proposal_type"
          AS ENUM(
            'website', 'branding', 'marketing-retainer', 'crm-automation',
            'consulting', 'one-time-project', 'monthly-retainer', 'custom'
          );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_proposals_discount_type') THEN
        CREATE TYPE "public"."enum_proposals_discount_type"
          AS ENUM('none', 'percent', 'fixed');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposals_status" ADD VALUE 'internal-review';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposals_status" ADD VALUE 'questions';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposals_status" ADD VALUE 'revision-requested';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposals_status" ADD VALUE 'declined';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_proposals_status" ADD VALUE 'archived';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposal_templates" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_type" "public"."enum_proposal_templates_proposal_type" DEFAULT 'website' NOT NULL,
      "active" boolean DEFAULT true,
      "sort_order" numeric DEFAULT 0,
      "title" varchar NOT NULL,
      "slug" varchar,
      "description" varchar,
      "hero_title" varchar,
      "hero_subtitle" varchar,
      "executive_summary" varchar,
      "scope" varchar,
      "deliverables" varchar,
      "timeline" varchar,
      "terms" varchar,
      "internal_notes" varchar,
      "section_blocks" jsonb,
      "optional_services" jsonb,
      "estimate_blueprint" jsonb,
      "default_investment" numeric,
      "default_recurring" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "estimate_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_id" integer NOT NULL REFERENCES "proposals"("id") ON DELETE CASCADE,
      "item_type" "public"."enum_estimate_items_item_type" DEFAULT 'fixed' NOT NULL,
      "is_recurring" boolean DEFAULT false,
      "is_optional" boolean DEFAULT false,
      "included_by_default" boolean DEFAULT true,
      "discountable" boolean DEFAULT true,
      "sort_order" numeric DEFAULT 0,
      "title" varchar NOT NULL,
      "description" varchar,
      "quantity" numeric DEFAULT 1,
      "unit_price" numeric,
      "hours" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposal_approvals" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_id" integer NOT NULL REFERENCES "proposals"("id") ON DELETE CASCADE,
      "action" "public"."enum_proposal_approvals_action" NOT NULL,
      "revision_number" numeric DEFAULT 1,
      "actor_name" varchar,
      "actor_email" varchar,
      "actor_role" varchar,
      "notes" varchar,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "proposal_activity" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_id" integer NOT NULL REFERENCES "proposals"("id") ON DELETE CASCADE,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "event_type" "public"."enum_proposal_activity_event_type" NOT NULL,
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
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "proposal_type" "public"."enum_proposals_proposal_type" DEFAULT 'website';
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "template_id" integer REFERENCES "proposal_templates"("id") ON DELETE SET NULL;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "related_project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "related_retainer_id" integer REFERENCES "retainers"("id") ON DELETE SET NULL;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "revision_number" numeric DEFAULT 1;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "hero_title" varchar;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "hero_subtitle" varchar;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "internal_notes" varchar;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "discount_type" "public"."enum_proposals_discount_type" DEFAULT 'none';
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "discount_value" numeric;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "tax_rate" numeric;
    ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "pricing_snapshot" jsonb;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "proposal_templates_proposal_type_idx" ON "proposal_templates" USING btree ("proposal_type");
    CREATE INDEX IF NOT EXISTS "estimate_items_proposal_idx" ON "estimate_items" USING btree ("proposal_id");
    CREATE INDEX IF NOT EXISTS "proposal_approvals_proposal_idx" ON "proposal_approvals" USING btree ("proposal_id");
    CREATE INDEX IF NOT EXISTS "proposal_activity_proposal_idx" ON "proposal_activity" USING btree ("proposal_id");
    CREATE INDEX IF NOT EXISTS "proposal_activity_client_idx" ON "proposal_activity" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "proposals_template_idx" ON "proposals" USING btree ("template_id");
    CREATE INDEX IF NOT EXISTS "proposals_related_project_idx" ON "proposals" USING btree ("related_project_id");
    CREATE INDEX IF NOT EXISTS "proposals_related_retainer_idx" ON "proposals" USING btree ("related_retainer_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "proposal_activity" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "proposal_approvals" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "estimate_items" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "proposal_templates" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposal_activity_event_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposal_approvals_action";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_estimate_items_item_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposal_templates_proposal_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposals_proposal_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_proposals_discount_type";`);
}
