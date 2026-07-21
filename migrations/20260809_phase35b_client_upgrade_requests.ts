/**
 * Phase 35B — Client Upgrade Requests collection.
 *
 * Additive only. Does not modify Phase 35A plan fields or CES enabledModules.
 * Does not invent upgrade request rows for existing clients.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_upgrade_requests_status'
      ) THEN
        CREATE TYPE "public"."enum_client_upgrade_requests_status" AS ENUM(
          'submitted', 'reviewing', 'approved', 'declined', 'canceled'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_upgrade_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL,
      "portal_user_id" integer,
      "requester_name" varchar,
      "requester_email" varchar,
      "module_key" varchar NOT NULL,
      "module_label" varchar NOT NULL,
      "status" "public"."enum_client_upgrade_requests_status" DEFAULT 'submitted' NOT NULL,
      "client_message" varchar,
      "operator_note" varchar,
      "source_surface" varchar,
      "entitlement_snapshot" jsonb,
      "reviewed_at" timestamp(3) with time zone,
      "reviewed_by" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_upgrade_requests_client_id_clients_id_fk'
      ) THEN
        ALTER TABLE "client_upgrade_requests"
          ADD CONSTRAINT "client_upgrade_requests_client_id_clients_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_upgrade_requests_portal_user_id_portal_users_id_fk'
      ) THEN
        ALTER TABLE "client_upgrade_requests"
          ADD CONSTRAINT "client_upgrade_requests_portal_user_id_portal_users_id_fk"
          FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_upgrade_requests_client_idx"
      ON "client_upgrade_requests" USING btree ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_upgrade_requests_module_key_idx"
      ON "client_upgrade_requests" USING btree ("module_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_upgrade_requests_status_idx"
      ON "client_upgrade_requests" USING btree ("status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_upgrade_requests_created_at_idx"
      ON "client_upgrade_requests" USING btree ("created_at");
  `);

  // At most one active (submitted/reviewing) request per client + module.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_upgrade_requests_active_unique"
      ON "client_upgrade_requests" ("client_id", "module_key")
      WHERE "status" IN ('submitted', 'reviewing');
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "client_upgrade_requests" CASCADE;
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_upgrade_requests_status";
  `);
}
