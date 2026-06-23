/**
 * KXD OS Phase 2A — Junior Creator Users + research_leads relationship
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_junior_creator_users_role' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_junior_creator_users_role"
          AS ENUM('junior_creator', 'researcher', 'trainee');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "junior_creator_users_sessions" (
      "_order"     integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id"         varchar PRIMARY KEY NOT NULL,
      "created_at" timestamp(3) with time zone,
      "expires_at" timestamp(3) with time zone NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "junior_creator_users" (
      "id"                        serial PRIMARY KEY NOT NULL,
      "display_name"              varchar NOT NULL,
      "role"                      "public"."enum_junior_creator_users_role" DEFAULT 'junior_creator' NOT NULL,
      "hourly_rate_cents"         numeric DEFAULT 800,
      "active"                    boolean DEFAULT true,
      "updated_at"                timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"                timestamp(3) with time zone DEFAULT now() NOT NULL,
      "email"                     varchar NOT NULL,
      "reset_password_token"      varchar,
      "reset_password_expiration" timestamp(3) with time zone,
      "salt"                      varchar,
      "hash"                      varchar,
      "login_attempts"            numeric DEFAULT 0,
      "lock_until"                timestamp(3) with time zone
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "junior_creator_users_email_idx"
      ON "junior_creator_users" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "junior_creator_users_sessions_parent_idx"
      ON "junior_creator_users_sessions"("_parent_id");
  `);

  await db.execute(sql`
    ALTER TABLE "research_leads"
      ADD COLUMN IF NOT EXISTS "junior_creator_user_id" integer;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'research_leads_junior_creator_user_id_fk'
          AND table_name = 'research_leads'
      ) THEN
        ALTER TABLE "research_leads"
          ADD CONSTRAINT "research_leads_junior_creator_user_id_fk"
          FOREIGN KEY ("junior_creator_user_id")
          REFERENCES "public"."junior_creator_users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "research_leads_junior_creator_user_id_idx"
      ON "research_leads" USING btree ("junior_creator_user_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "research_leads_junior_creator_user_id_idx";
    ALTER TABLE "research_leads" DROP CONSTRAINT IF EXISTS "research_leads_junior_creator_user_id_fk";
    ALTER TABLE "research_leads" DROP COLUMN IF EXISTS "junior_creator_user_id";
  `);
  await db.execute(sql`
    DROP INDEX IF EXISTS "junior_creator_users_email_idx";
    DROP INDEX IF EXISTS "junior_creator_users_sessions_parent_idx";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "junior_creator_users_sessions" CASCADE;
    DROP TABLE IF EXISTS "junior_creator_users" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_junior_creator_users_role";
  `);
}
