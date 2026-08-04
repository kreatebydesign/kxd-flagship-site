/**
 * Phase 6 Batch C0 — KXD Connect tenancy, membership, metering, and audit foundation.
 *
 * Additive only. Does not seed production organizations, memberships, or enable Connect.
 * Bootstrap of the KXD organization is a separate controlled script.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_organizations_status'
      ) THEN
        CREATE TYPE "public"."enum_connect_organizations_status" AS ENUM(
          'active',
          'inactive'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_organization_memberships_subject_kind'
      ) THEN
        CREATE TYPE "public"."enum_connect_organization_memberships_subject_kind" AS ENUM(
          'staff-user',
          'portal-user'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_organization_memberships_role'
      ) THEN
        CREATE TYPE "public"."enum_connect_organization_memberships_role" AS ENUM(
          'platform-operator',
          'organization-admin',
          'organization-member'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_organization_memberships_status'
      ) THEN
        CREATE TYPE "public"."enum_connect_organization_memberships_status" AS ENUM(
          'active',
          'disabled'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_usage_meters_meter_key'
      ) THEN
        CREATE TYPE "public"."enum_connect_usage_meters_meter_key" AS ENUM(
          'active_internal_members',
          'active_external_participants',
          'messages_sent',
          'conversations_created',
          'attachment_bytes_stored',
          'transfer_bytes_upload',
          'transfer_bytes_download',
          'notifications_sent',
          'ai_operations',
          'ai_tokens',
          'ai_estimated_provider_cost_micros'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_usage_meters_period_kind'
      ) THEN
        CREATE TYPE "public"."enum_connect_usage_meters_period_kind" AS ENUM(
          'daily'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_audit_events_type'
      ) THEN
        CREATE TYPE "public"."enum_connect_audit_events_type" AS ENUM(
          'organization.created',
          'organization.activated',
          'organization.deactivated',
          'membership.created',
          'membership.role_changed',
          'membership.disabled',
          'connect.enabled',
          'connect.disabled',
          'meter.adjusted'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_audit_events_actor_kind'
      ) THEN
        CREATE TYPE "public"."enum_connect_audit_events_actor_kind" AS ENUM(
          'operator',
          'system'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_organizations" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "name" varchar NOT NULL,
      "status" "public"."enum_connect_organizations_status" DEFAULT 'inactive' NOT NULL,
      "config" jsonb,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_organizations_key_uidx"
      ON "connect_organizations" ("key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_organizations_status_idx"
      ON "connect_organizations" ("status");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_organization_memberships" (
      "id" serial PRIMARY KEY NOT NULL,
      "organization_id" integer NOT NULL,
      "subject_kind" "public"."enum_connect_organization_memberships_subject_kind" NOT NULL,
      "staff_user_id" integer,
      "portal_user_id" integer,
      "role" "public"."enum_connect_organization_memberships_role" DEFAULT 'organization-member' NOT NULL,
      "status" "public"."enum_connect_organization_memberships_status" DEFAULT 'active' NOT NULL,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_organization_memberships"
        ADD CONSTRAINT "connect_organization_memberships_organization_id_connect_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."connect_organizations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_organization_memberships"
        ADD CONSTRAINT "connect_organization_memberships_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_organization_memberships"
        ADD CONSTRAINT "connect_organization_memberships_portal_user_id_portal_users_id_fk"
        FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_org_memberships_staff_uidx"
      ON "connect_organization_memberships" ("organization_id", "staff_user_id")
      WHERE "staff_user_id" IS NOT NULL;
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_org_memberships_portal_uidx"
      ON "connect_organization_memberships" ("organization_id", "portal_user_id")
      WHERE "portal_user_id" IS NOT NULL;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_org_memberships_org_idx"
      ON "connect_organization_memberships" ("organization_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_org_memberships_status_idx"
      ON "connect_organization_memberships" ("status");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_usage_meters" (
      "id" serial PRIMARY KEY NOT NULL,
      "organization_id" integer NOT NULL,
      "meter_key" "public"."enum_connect_usage_meters_meter_key" NOT NULL,
      "period_kind" "public"."enum_connect_usage_meters_period_kind" DEFAULT 'daily' NOT NULL,
      "period_key" varchar NOT NULL,
      "quantity" numeric DEFAULT 0 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_usage_meters"
        ADD CONSTRAINT "connect_usage_meters_organization_id_connect_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."connect_organizations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_usage_meters_org_meter_period_uidx"
      ON "connect_usage_meters" ("organization_id", "meter_key", "period_kind", "period_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_usage_meters_org_idx"
      ON "connect_usage_meters" ("organization_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_usage_idempotency" (
      "id" serial PRIMARY KEY NOT NULL,
      "organization_id" integer NOT NULL,
      "idempotency_key" varchar NOT NULL,
      "meter_key" varchar NOT NULL,
      "period_kind" varchar DEFAULT 'daily' NOT NULL,
      "period_key" varchar NOT NULL,
      "delta" numeric NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_usage_idempotency"
        ADD CONSTRAINT "connect_usage_idempotency_organization_id_connect_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."connect_organizations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_usage_idempotency_org_key_uidx"
      ON "connect_usage_idempotency" ("organization_id", "idempotency_key");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_audit_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "type" "public"."enum_connect_audit_events_type" NOT NULL,
      "organization_id" integer,
      "actor_kind" "public"."enum_connect_audit_events_actor_kind" DEFAULT 'system' NOT NULL,
      "actor_operator_user_id" numeric,
      "summary" varchar NOT NULL,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_audit_events"
        ADD CONSTRAINT "connect_audit_events_organization_id_connect_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."connect_organizations"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_audit_events_type_idx"
      ON "connect_audit_events" ("type");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_audit_events_org_idx"
      ON "connect_audit_events" ("organization_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_audit_events_created_idx"
      ON "connect_audit_events" ("created_at");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_organizations_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_organization_memberships_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_usage_meters_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_usage_idempotency_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_audit_events_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_audit_events_id";
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_usage_idempotency_id";
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_usage_meters_id";
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_organization_memberships_id";
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_organizations_id";
  `);

  await db.execute(sql`DROP TABLE IF EXISTS "connect_audit_events" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "connect_usage_idempotency" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "connect_usage_meters" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "connect_organization_memberships" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "connect_organizations" CASCADE;`);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_audit_events_actor_kind";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_audit_events_type";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_usage_meters_period_kind";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_usage_meters_meter_key";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_organization_memberships_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_organization_memberships_role";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_organization_memberships_subject_kind";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_connect_organizations_status";`);
}
