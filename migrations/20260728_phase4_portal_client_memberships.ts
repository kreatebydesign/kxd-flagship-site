/**
 * Phase 4 Batch A — Portal client memberships foundation.
 * Additive: membership table, unique (portal_user, client), last_active_client_id,
 * and backfill from legacy portal_users.client. Does not drop legacy client.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_portal_client_memberships_status'
      ) THEN
        CREATE TYPE "public"."enum_portal_client_memberships_status" AS ENUM(
          'active',
          'disabled'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portal_client_memberships" (
      "id" serial PRIMARY KEY NOT NULL,
      "portal_user_id" integer NOT NULL,
      "client_id" integer NOT NULL,
      "status" "public"."enum_portal_client_memberships_status" DEFAULT 'active' NOT NULL,
      "is_default" boolean DEFAULT false NOT NULL,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_client_memberships"
        ADD CONSTRAINT "portal_client_memberships_portal_user_id_portal_users_id_fk"
        FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portal_client_memberships"
        ADD CONSTRAINT "portal_client_memberships_client_id_clients_id_fk"
        FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "portal_client_memberships_user_client_uidx"
      ON "portal_client_memberships" ("portal_user_id", "client_id");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_client_memberships_user_idx"
      ON "portal_client_memberships" ("portal_user_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_client_memberships_client_idx"
      ON "portal_client_memberships" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_client_memberships_status_idx"
      ON "portal_client_memberships" ("status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portal_client_memberships_updated_idx"
      ON "portal_client_memberships" ("updated_at");
  `);

  await db.execute(sql`
    ALTER TABLE "portal_users"
      ADD COLUMN IF NOT EXISTS "last_active_client_id" numeric;
  `);

  // Backfill one active default membership for each portal user with a valid legacy client.
  // Skip invalid/missing client FKs — do not invent clients.
  await db.execute(sql`
    INSERT INTO "portal_client_memberships" (
      "portal_user_id",
      "client_id",
      "status",
      "is_default",
      "created_at",
      "updated_at"
    )
    SELECT
      pu.id,
      pu.client_id,
      'active',
      true,
      now(),
      now()
    FROM "portal_users" pu
    INNER JOIN "clients" c ON c.id = pu.client_id
    WHERE pu.client_id IS NOT NULL
    ON CONFLICT ("portal_user_id", "client_id") DO NOTHING;
  `);

  await db.execute(sql`
    UPDATE "portal_users" pu
    SET "last_active_client_id" = pu.client_id
    WHERE pu.client_id IS NOT NULL
      AND pu."last_active_client_id" IS NULL
      AND EXISTS (SELECT 1 FROM "clients" c WHERE c.id = pu.client_id);
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portal_client_memberships_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "portal_client_memberships_id";
  `);

  await db.execute(sql`
    ALTER TABLE "portal_users"
      DROP COLUMN IF EXISTS "last_active_client_id";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "portal_client_memberships" CASCADE;
  `);

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_portal_client_memberships_status";
  `);
}
