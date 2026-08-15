/**
 * Additive: Research Desk qualification fields on research_leads.
 *
 * - grade (A+ … F)
 * - reject_reason
 * - qualification_evidence
 *
 * Safety: ADD COLUMN / CREATE TYPE only (IF NOT EXISTS). No backfill. No drops.
 * Existing research leads remain valid with null new fields.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_research_leads_grade'
      ) THEN
        CREATE TYPE "public"."enum_research_leads_grade" AS ENUM(
          'A+',
          'A',
          'B',
          'C',
          'D',
          'F'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_research_leads_reject_reason'
      ) THEN
        CREATE TYPE "public"."enum_research_leads_reject_reason" AS ENUM(
          'spam',
          'international',
          'commission-only',
          'internship',
          'barter',
          'crypto',
          'recruiter',
          'duplicate',
          'irrelevant',
          'low-value',
          'other'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "research_leads"
      ADD COLUMN IF NOT EXISTS "grade" "public"."enum_research_leads_grade",
      ADD COLUMN IF NOT EXISTS "reject_reason" "public"."enum_research_leads_reject_reason",
      ADD COLUMN IF NOT EXISTS "qualification_evidence" varchar;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "research_leads_grade_idx"
      ON "research_leads" USING btree ("grade");
    CREATE INDEX IF NOT EXISTS "research_leads_reject_reason_idx"
      ON "research_leads" USING btree ("reject_reason");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "research_leads_grade_idx";
    DROP INDEX IF EXISTS "research_leads_reject_reason_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "research_leads"
      DROP COLUMN IF EXISTS "grade",
      DROP COLUMN IF EXISTS "reject_reason",
      DROP COLUMN IF EXISTS "qualification_evidence";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_research_leads_grade";
    DROP TYPE IF EXISTS "public"."enum_research_leads_reject_reason";
  `);
}
