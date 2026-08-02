/**
 * Phase 6 Batch C1 — KXD Connect secure conversation and messaging core.
 *
 * Additive only. Does not enable Connect, seed conversations, or expose UI.
 *
 * Migration date note:
 * `20260815_phase6_connect_c0_foundation` uses a sequential prefix after
 * `20260814_phase4_portal_identity_security`, matching repository ordering
 * (not calendar authorship). C1 continues that sequence as `20260816`.
 * Both C0 and C1 migrations remain unapplied locally/production until an
 * authorized operator runs migrate on a non-production target.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Extend C0 audit enum with C1 conversation events (additive).
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_connect_audit_events_type"
        ADD VALUE IF NOT EXISTS 'conversation.created';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_connect_audit_events_type"
        ADD VALUE IF NOT EXISTS 'conversation.archived';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_connect_audit_events_type"
        ADD VALUE IF NOT EXISTS 'conversation.reactivated';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_connect_audit_events_type"
        ADD VALUE IF NOT EXISTS 'conversation.participant_added';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_connect_audit_events_type"
        ADD VALUE IF NOT EXISTS 'conversation.participant_removed';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_conversations_type'
      ) THEN
        CREATE TYPE "public"."enum_connect_conversations_type" AS ENUM(
          'direct',
          'group'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_connect_conversations_status'
      ) THEN
        CREATE TYPE "public"."enum_connect_conversations_status" AS ENUM(
          'active',
          'archived'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_connect_conversation_participants_status'
      ) THEN
        CREATE TYPE "public"."enum_connect_conversation_participants_status" AS ENUM(
          'active',
          'left'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_conversations" (
      "id" serial PRIMARY KEY NOT NULL,
      "public_id" varchar NOT NULL,
      "organization_id" integer NOT NULL,
      "type" "public"."enum_connect_conversations_type" NOT NULL,
      "status" "public"."enum_connect_conversations_status" DEFAULT 'active' NOT NULL,
      "title" varchar,
      "direct_pair_key" varchar,
      "latest_message_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_conversations"
        ADD CONSTRAINT "connect_conversations_organization_id_connect_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."connect_organizations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_conversations_public_id_uidx"
      ON "connect_conversations" ("public_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_conversations_org_idx"
      ON "connect_conversations" ("organization_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_conversations_status_idx"
      ON "connect_conversations" ("status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_conversations_latest_idx"
      ON "connect_conversations" ("latest_message_at");
  `);
  // One active direct conversation per participant pair inside an organization.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_conversations_direct_pair_uidx"
      ON "connect_conversations" ("organization_id", "direct_pair_key")
      WHERE "type" = 'direct'
        AND "status" = 'active'
        AND "direct_pair_key" IS NOT NULL;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_conversation_participants" (
      "id" serial PRIMARY KEY NOT NULL,
      "public_id" varchar NOT NULL,
      "organization_id" integer NOT NULL,
      "conversation_id" integer NOT NULL,
      "membership_id" integer NOT NULL,
      "status" "public"."enum_connect_conversation_participants_status" DEFAULT 'active' NOT NULL,
      "joined_at" timestamp(3) with time zone NOT NULL,
      "last_read_message_public_id" varchar,
      "last_read_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_conversation_participants"
        ADD CONSTRAINT "connect_conversation_participants_organization_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."connect_organizations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_conversation_participants"
        ADD CONSTRAINT "connect_conversation_participants_conversation_id_fk"
        FOREIGN KEY ("conversation_id") REFERENCES "public"."connect_conversations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_conversation_participants"
        ADD CONSTRAINT "connect_conversation_participants_membership_id_fk"
        FOREIGN KEY ("membership_id") REFERENCES "public"."connect_organization_memberships"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_conversation_participants_public_id_uidx"
      ON "connect_conversation_participants" ("public_id");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_conversation_participants_active_uidx"
      ON "connect_conversation_participants" ("conversation_id", "membership_id")
      WHERE "status" = 'active';
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_conversation_participants_org_idx"
      ON "connect_conversation_participants" ("organization_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_conversation_participants_conv_idx"
      ON "connect_conversation_participants" ("conversation_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_conversation_participants_membership_idx"
      ON "connect_conversation_participants" ("membership_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connect_messages" (
      "id" serial PRIMARY KEY NOT NULL,
      "public_id" varchar NOT NULL,
      "organization_id" integer NOT NULL,
      "conversation_id" integer NOT NULL,
      "author_participant_id" integer NOT NULL,
      "body" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_messages"
        ADD CONSTRAINT "connect_messages_organization_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."connect_organizations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_messages"
        ADD CONSTRAINT "connect_messages_conversation_id_fk"
        FOREIGN KEY ("conversation_id") REFERENCES "public"."connect_conversations"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "connect_messages"
        ADD CONSTRAINT "connect_messages_author_participant_id_fk"
        FOREIGN KEY ("author_participant_id")
        REFERENCES "public"."connect_conversation_participants"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "connect_messages_public_id_uidx"
      ON "connect_messages" ("public_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_messages_org_idx"
      ON "connect_messages" ("organization_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_messages_conversation_idx"
      ON "connect_messages" ("conversation_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_messages_author_idx"
      ON "connect_messages" ("author_participant_id");
  `);
  // Stable pagination / newer-than-cursor polling support.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "connect_messages_conv_created_public_idx"
      ON "connect_messages" ("conversation_id", "created_at", "public_id");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_conversations_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_conversation_participants_id" integer;
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "connect_messages_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_messages_id";
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_conversation_participants_id";
  `);
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "connect_conversations_id";
  `);

  await db.execute(sql`DROP TABLE IF EXISTS "connect_messages" CASCADE;`);
  await db.execute(
    sql`DROP TABLE IF EXISTS "connect_conversation_participants" CASCADE;`,
  );
  await db.execute(sql`DROP TABLE IF EXISTS "connect_conversations" CASCADE;`);

  await db.execute(
    sql`DROP TYPE IF EXISTS "public"."enum_connect_conversation_participants_status";`,
  );
  await db.execute(
    sql`DROP TYPE IF EXISTS "public"."enum_connect_conversations_status";`,
  );
  await db.execute(
    sql`DROP TYPE IF EXISTS "public"."enum_connect_conversations_type";`,
  );
  // Enum values added to connect_audit_events_type cannot be safely removed
  // without rewriting the type; leave them in place on down.
}
