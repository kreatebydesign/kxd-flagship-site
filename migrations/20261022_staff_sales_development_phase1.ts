/**
 * Staff Sales Development Phase 1 — staff attribution on canonical sales-leads.
 *
 * Additive only. No backfill. Local apply until production migration is authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sales_leads"
      ADD COLUMN IF NOT EXISTS "sourced_by_staff_user_id" integer,
      ADD COLUMN IF NOT EXISTS "assigned_staff_user_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_sourced_by_staff_user_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_sourced_by_staff_user_id_fk"
          FOREIGN KEY ("sourced_by_staff_user_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_leads_assigned_staff_user_id_fk'
      ) THEN
        ALTER TABLE "sales_leads"
          ADD CONSTRAINT "sales_leads_assigned_staff_user_id_fk"
          FOREIGN KEY ("assigned_staff_user_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sales_leads_sourced_by_staff_user_idx"
      ON "sales_leads" ("sourced_by_staff_user_id");
    CREATE INDEX IF NOT EXISTS "sales_leads_assigned_staff_user_idx"
      ON "sales_leads" ("assigned_staff_user_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "sales_leads_assigned_staff_user_idx";
    DROP INDEX IF EXISTS "sales_leads_sourced_by_staff_user_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      DROP CONSTRAINT IF EXISTS "sales_leads_assigned_staff_user_id_fk",
      DROP CONSTRAINT IF EXISTS "sales_leads_sourced_by_staff_user_id_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      DROP COLUMN IF EXISTS "assigned_staff_user_id",
      DROP COLUMN IF EXISTS "sourced_by_staff_user_id";
  `);
}
