/**
 * KXD OS Phase 5A — Client Portal authentication tables.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_users_sessions" (
      "_order"    integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id"        varchar PRIMARY KEY NOT NULL,
      "created_at" timestamp(3) with time zone,
      "expires_at" timestamp(3) with time zone NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_users" (
      "id"                        serial PRIMARY KEY NOT NULL,
      "display_name"              varchar,
      "client_id"                 integer REFERENCES "clients"("id") ON DELETE SET NULL,
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
    CREATE UNIQUE INDEX IF NOT EXISTS "portal_users_email_idx"
      ON "portal_users" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "portal_users_client_idx"
      ON "portal_users" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "portal_users_sessions_parent_idx"
      ON "portal_users_sessions"("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "portal_users_email_idx";
    DROP INDEX IF EXISTS "portal_users_client_idx";
    DROP INDEX IF EXISTS "portal_users_sessions_parent_idx";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "portal_users_sessions" CASCADE;
    DROP TABLE IF EXISTS "portal_users" CASCADE;
  `);
}
