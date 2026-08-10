/**
 * Add stable source identity for reviewed, idempotent inventory imports.
 * Code registration only; production application requires explicit approval.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_inventory_vehicles"
      ADD COLUMN IF NOT EXISTS "source_system" varchar,
      ADD COLUMN IF NOT EXISTS "source_external_id" varchar,
      ADD COLUMN IF NOT EXISTS "last_source_sync_at" timestamp(3) with time zone;
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_inventory_vehicles_source_identity_uidx"
      ON "client_inventory_vehicles" ("client_id", "source_system", "source_external_id")
      WHERE "source_system" IS NOT NULL AND "source_external_id" IS NOT NULL;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_source_system_idx"
      ON "client_inventory_vehicles" ("source_system");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_source_external_id_idx"
      ON "client_inventory_vehicles" ("source_external_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "client_inventory_vehicles_source_external_id_idx";
    DROP INDEX IF EXISTS "client_inventory_vehicles_source_system_idx";
    DROP INDEX IF EXISTS "client_inventory_vehicles_source_identity_uidx";
    ALTER TABLE "client_inventory_vehicles"
      DROP COLUMN IF EXISTS "last_source_sync_at",
      DROP COLUMN IF EXISTS "source_external_id",
      DROP COLUMN IF EXISTS "source_system";
  `);
}
