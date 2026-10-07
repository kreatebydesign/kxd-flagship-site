/**
 * Partner Portal Phase 3 — private partner invitations.
 * Additive only. Local apply until production migration is authorized.
 * Does not mutate CES Portal Access invitations or active partner records.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_kxd_partner_profiles_status'
      ) THEN
        ALTER TYPE "public"."enum_kxd_partner_profiles_status"
          ADD VALUE IF NOT EXISTS 'invited';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_kxd_partner_invitations_status'
      ) THEN
        CREATE TYPE "public"."enum_kxd_partner_invitations_status" AS ENUM(
          'sent', 'opened', 'accepted', 'expired', 'revoked'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "kxd_partner_invitations" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar NOT NULL,
      "display_name" varchar NOT NULL,
      "personal_note" varchar,
      "status" "public"."enum_kxd_partner_invitations_status" DEFAULT 'sent' NOT NULL,
      "partner_profile_id" integer NOT NULL,
      "portal_user_id" integer NOT NULL,
      "invited_by_id" integer,
      "token_hash" varchar,
      "token_version" numeric DEFAULT 0,
      "expires_at" timestamp(3) with time zone,
      "send_count" numeric DEFAULT 0,
      "sent_at" timestamp(3) with time zone,
      "last_sent_at" timestamp(3) with time zone,
      "first_opened_at" timestamp(3) with time zone,
      "accepted_at" timestamp(3) with time zone,
      "revoked_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'kxd_partner_invitations_partner_profile_id_kxd_partner_profiles_id_fk'
      ) THEN
        ALTER TABLE "kxd_partner_invitations"
          ADD CONSTRAINT "kxd_partner_invitations_partner_profile_id_kxd_partner_profiles_id_fk"
          FOREIGN KEY ("partner_profile_id") REFERENCES "kxd_partner_profiles"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'kxd_partner_invitations_portal_user_id_portal_users_id_fk'
      ) THEN
        ALTER TABLE "kxd_partner_invitations"
          ADD CONSTRAINT "kxd_partner_invitations_portal_user_id_portal_users_id_fk"
          FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'kxd_partner_invitations_invited_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "kxd_partner_invitations"
          ADD CONSTRAINT "kxd_partner_invitations_invited_by_id_users_id_fk"
          FOREIGN KEY ("invited_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "kxd_partner_invitations_partner_profile_idx"
      ON "kxd_partner_invitations" ("partner_profile_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "kxd_partner_invitations_portal_user_idx"
      ON "kxd_partner_invitations" ("portal_user_id");
    CREATE INDEX IF NOT EXISTS "kxd_partner_invitations_email_idx"
      ON "kxd_partner_invitations" ("email");
    CREATE INDEX IF NOT EXISTS "kxd_partner_invitations_status_idx"
      ON "kxd_partner_invitations" ("status");
    CREATE INDEX IF NOT EXISTS "kxd_partner_invitations_token_hash_idx"
      ON "kxd_partner_invitations" ("token_hash");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "kxd_partner_invitations";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_kxd_partner_invitations_status";
  `);
  // Postgres cannot safely remove enum values from enum_kxd_partner_profiles_status.
}
