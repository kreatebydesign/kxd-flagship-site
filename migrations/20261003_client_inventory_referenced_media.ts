/**
 * Additive referenced source-media JSON for inventory vehicles that reuse
 * durable public photography instead of copying files into KXD Blob storage.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_inventory_vehicles"
      ADD COLUMN IF NOT EXISTS "referenced_media" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_inventory_vehicles"
      DROP COLUMN IF EXISTS "referenced_media";
  `);
}
