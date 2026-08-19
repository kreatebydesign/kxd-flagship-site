/**
 * Additive: Sales closed-loop V1 — lost reason on sales_leads.
 *
 * Safety: ADD COLUMN / CREATE TYPE only (IF NOT EXISTS). No backfill.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_sales_leads_lost_reason'
      ) THEN
        CREATE TYPE "public"."enum_sales_leads_lost_reason" AS ENUM(
          'no-response',
          'budget',
          'timing',
          'chose-competitor',
          'not-a-fit',
          'project-cancelled',
          'other'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "sales_leads"
      ADD COLUMN IF NOT EXISTS "lost_reason" "public"."enum_sales_leads_lost_reason";
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sales_leads_lost_reason_idx"
      ON "sales_leads" USING btree ("lost_reason");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "sales_leads_lost_reason_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "sales_leads"
      DROP COLUMN IF EXISTS "lost_reason";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_sales_leads_lost_reason";
  `);
}
