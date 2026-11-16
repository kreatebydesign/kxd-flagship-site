/**
 * Primal calendar — optional registration and service prices (USD cents).
 * Apply locally only until production approval.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_calendar_events"
      ADD COLUMN IF NOT EXISTS "registration_price_cents" integer,
      ADD COLUMN IF NOT EXISTS "support_price_cents" integer,
      ADD COLUMN IF NOT EXISTS "transportation_price_cents" integer,
      ADD COLUMN IF NOT EXISTS "new_tires_price_cents" integer,
      ADD COLUMN IF NOT EXISTS "other_service_name" varchar,
      ADD COLUMN IF NOT EXISTS "other_service_price_cents" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "client_calendar_events"
      DROP COLUMN IF EXISTS "registration_price_cents",
      DROP COLUMN IF EXISTS "support_price_cents",
      DROP COLUMN IF EXISTS "transportation_price_cents",
      DROP COLUMN IF EXISTS "new_tires_price_cents",
      DROP COLUMN IF EXISTS "other_service_name",
      DROP COLUMN IF EXISTS "other_service_price_cents";
  `);
}