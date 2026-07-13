/**
 * Phase 28B fix — Align sales_leads MRR column with Payload field mapping.
 *
 * Root cause: collection field `estimatedMRR` is mapped by Payload/Drizzle to
 * `estimated_m_r_r`, but Phase 6A created `estimated_mrr`. Sales pipeline SELECT fails.
 *
 * Forward-only: rename existing column (preserves data) or add if missing.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_leads'
          AND column_name = 'estimated_mrr'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_leads'
          AND column_name = 'estimated_m_r_r'
      ) THEN
        ALTER TABLE "sales_leads" RENAME COLUMN "estimated_mrr" TO "estimated_m_r_r";
      ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_leads'
          AND column_name = 'estimated_m_r_r'
      ) THEN
        ALTER TABLE "sales_leads" ADD COLUMN "estimated_m_r_r" numeric;
      END IF;

      -- If both columns somehow exist, copy legacy values then drop legacy.
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_leads'
          AND column_name = 'estimated_mrr'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_leads'
          AND column_name = 'estimated_m_r_r'
      ) THEN
        UPDATE "sales_leads"
        SET "estimated_m_r_r" = COALESCE("estimated_m_r_r", "estimated_mrr")
        WHERE "estimated_m_r_r" IS NULL AND "estimated_mrr" IS NOT NULL;
        ALTER TABLE "sales_leads" DROP COLUMN "estimated_mrr";
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_leads'
          AND column_name = 'estimated_m_r_r'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_leads'
          AND column_name = 'estimated_mrr'
      ) THEN
        ALTER TABLE "sales_leads" RENAME COLUMN "estimated_m_r_r" TO "estimated_mrr";
      END IF;
    END $$;
  `);
}
