/**
 * Phase 4 Batch I — Portal identity & security foundation.
 * Additive: membership roles, invitations, passkeys, MFA, recovery, challenges, audit.
 * Legacy memberships backfill to client-member (no silent elevation).
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_portal_client_memberships_role'
      ) THEN
        CREATE TYPE "public"."enum_portal_client_memberships_role" AS ENUM(
          'client-owner',
          'client-admin',
          'client-member'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "portal_client_memberships"
      ADD COLUMN IF NOT EXISTS "role" "public"."enum_portal_client_memberships_role"
        DEFAULT 'client-member' NOT NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "portal_client_memberships"
      ADD COLUMN IF NOT EXISTS "can_manage_members" boolean DEFAULT false NOT NULL;
  `);

  await db.execute(sql`
    UPDATE "portal_client_memberships"
    SET "role" = 'client-member'
    WHERE "role" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "portal_users"
      ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp(3) with time zone;
  `);
  await db.execute(sql`
    ALTER TABLE "portal_users"
      ADD COLUMN IF NOT EXISTS "security_enrollment_completed_at" timestamp(3) with time zone;
  `);
  await db.execute(sql`
    ALTER TABLE "portal_users"
      ADD COLUMN IF NOT EXISTS "last_step_up_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_portal_invitations_status'
      ) THEN
        CREATE TYPE "public"."enum_portal_invitations_status" AS ENUM(
          'draft', 'sent', 'opened', 'accepted', 'expired', 'revoked'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_invitations" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar NOT NULL,
      "display_name" varchar,
      "status" "public"."enum_portal_invitations_status" DEFAULT 'draft' NOT NULL,
      "welcome_note" varchar,
      "invited_by_id" integer,
      "token_hash" varchar,
      "token_version" numeric DEFAULT 0 NOT NULL,
      "expires_at" timestamp(3) with time zone,
      "allow_existing_user_expansion" boolean DEFAULT false NOT NULL,
      "send_count" numeric DEFAULT 0 NOT NULL,
      "sent_at" timestamp(3) with time zone,
      "first_opened_at" timestamp(3) with time zone,
      "accepted_at" timestamp(3) with time zone,
      "revoked_at" timestamp(3) with time zone,
      "last_sent_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_invitations"
        ADD CONSTRAINT "portal_invitations_invited_by_id_users_id_fk"
        FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_invitations_email_idx"
      ON "portal_invitations" ("email");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_invitations_status_idx"
      ON "portal_invitations" ("status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_invitations_token_hash_idx"
      ON "portal_invitations" ("token_hash");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_portal_invitation_memberships_role'
      ) THEN
        CREATE TYPE "public"."enum_portal_invitation_memberships_role" AS ENUM(
          'client-owner',
          'client-admin',
          'client-member'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_invitation_memberships" (
      "id" serial PRIMARY KEY NOT NULL,
      "invitation_id" integer NOT NULL,
      "client_id" integer NOT NULL,
      "role" "public"."enum_portal_invitation_memberships_role" DEFAULT 'client-member' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_invitation_memberships"
        ADD CONSTRAINT "portal_invitation_memberships_invitation_id_fk"
        FOREIGN KEY ("invitation_id") REFERENCES "public"."portal_invitations"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_invitation_memberships"
        ADD CONSTRAINT "portal_invitation_memberships_client_id_fk"
        FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "portal_invitation_memberships_inv_client_uidx"
      ON "portal_invitation_memberships" ("invitation_id", "client_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_passkeys" (
      "id" serial PRIMARY KEY NOT NULL,
      "portal_user_id" integer NOT NULL,
      "credential_id" varchar NOT NULL,
      "public_key" varchar NOT NULL,
      "counter" numeric DEFAULT 0 NOT NULL,
      "transports" jsonb,
      "device_type" varchar,
      "backed_up" boolean DEFAULT false,
      "label" varchar,
      "last_used_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_passkeys"
        ADD CONSTRAINT "portal_passkeys_portal_user_id_fk"
        FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "portal_passkeys_credential_id_uidx"
      ON "portal_passkeys" ("credential_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_passkeys_portal_user_idx"
      ON "portal_passkeys" ("portal_user_id");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_portal_mfa_settings_preferred_method'
      ) THEN
        CREATE TYPE "public"."enum_portal_mfa_settings_preferred_method" AS ENUM(
          'password',
          'passkey'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_mfa_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "portal_user_id" integer NOT NULL,
      "totp_secret_encrypted" varchar,
      "totp_enabled" boolean DEFAULT false NOT NULL,
      "enrolled_at" timestamp(3) with time zone,
      "preferred_method" "public"."enum_portal_mfa_settings_preferred_method" DEFAULT 'password',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_mfa_settings"
        ADD CONSTRAINT "portal_mfa_settings_portal_user_id_fk"
        FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "portal_mfa_settings_portal_user_uidx"
      ON "portal_mfa_settings" ("portal_user_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_recovery_codes" (
      "id" serial PRIMARY KEY NOT NULL,
      "portal_user_id" integer NOT NULL,
      "code_hash" varchar NOT NULL,
      "used_at" timestamp(3) with time zone,
      "batch_id" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_recovery_codes"
        ADD CONSTRAINT "portal_recovery_codes_portal_user_id_fk"
        FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_recovery_codes_portal_user_idx"
      ON "portal_recovery_codes" ("portal_user_id");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_portal_auth_challenges_purpose'
      ) THEN
        CREATE TYPE "public"."enum_portal_auth_challenges_purpose" AS ENUM(
          'webauthn-register',
          'webauthn-auth',
          'step-up'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_auth_challenges" (
      "id" serial PRIMARY KEY NOT NULL,
      "purpose" "public"."enum_portal_auth_challenges_purpose" NOT NULL,
      "portal_user_id" integer,
      "challenge" varchar NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "consumed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_auth_challenges"
        ADD CONSTRAINT "portal_auth_challenges_portal_user_id_fk"
        FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_auth_challenges_challenge_idx"
      ON "portal_auth_challenges" ("challenge");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_portal_security_events_actor_kind'
      ) THEN
        CREATE TYPE "public"."enum_portal_security_events_actor_kind" AS ENUM(
          'portal-user',
          'operator',
          'system'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_security_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "type" varchar NOT NULL,
      "actor_kind" "public"."enum_portal_security_events_actor_kind" DEFAULT 'system' NOT NULL,
      "actor_portal_user_id" numeric,
      "actor_operator_user_id" numeric,
      "summary" varchar NOT NULL,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_security_events_type_idx"
      ON "portal_security_events" ("type");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_security_events_created_idx"
      ON "portal_security_events" ("created_at");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_invitations_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_invitation_memberships_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_passkeys_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_mfa_settings_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_recovery_codes_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_auth_challenges_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_security_events_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "portal_invitations_id",
      DROP COLUMN IF EXISTS "portal_invitation_memberships_id",
      DROP COLUMN IF EXISTS "portal_passkeys_id",
      DROP COLUMN IF EXISTS "portal_mfa_settings_id",
      DROP COLUMN IF EXISTS "portal_recovery_codes_id",
      DROP COLUMN IF EXISTS "portal_auth_challenges_id",
      DROP COLUMN IF EXISTS "portal_security_events_id";
  `);

  await db.execute(sql`DROP TABLE IF EXISTS "portal_security_events" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "portal_auth_challenges" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "portal_recovery_codes" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "portal_mfa_settings" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "portal_passkeys" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "portal_invitation_memberships" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "portal_invitations" CASCADE;`);

  await db.execute(sql`
    ALTER TABLE "portal_users"
      DROP COLUMN IF EXISTS "terms_accepted_at",
      DROP COLUMN IF EXISTS "security_enrollment_completed_at",
      DROP COLUMN IF EXISTS "last_step_up_at";
  `);

  await db.execute(sql`
    ALTER TABLE "portal_client_memberships"
      DROP COLUMN IF EXISTS "can_manage_members",
      DROP COLUMN IF EXISTS "role";
  `);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_portal_security_events_actor_kind";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_portal_auth_challenges_purpose";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_portal_mfa_settings_preferred_method";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_portal_invitation_memberships_role";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_portal_invitations_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_portal_client_memberships_role";`);
}
