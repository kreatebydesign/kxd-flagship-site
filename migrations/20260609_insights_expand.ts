import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Add new category enum values to insights.
// Uses exception-based approach since ALTER TYPE ADD VALUE cannot always run
// inside an explicit transaction on all Postgres versions.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      -- New editorial category values
      BEGIN
        ALTER TYPE "public"."enum_insights_category" ADD VALUE 'operational-systems';
      EXCEPTION WHEN duplicate_object THEN NULL; END;

      BEGIN
        ALTER TYPE "public"."enum_insights_category" ADD VALUE 'hospitality-growth';
      EXCEPTION WHEN duplicate_object THEN NULL; END;

      BEGIN
        ALTER TYPE "public"."enum_insights_category" ADD VALUE 'motorsports-strategy';
      EXCEPTION WHEN duplicate_object THEN NULL; END;

      BEGIN
        ALTER TYPE "public"."enum_insights_category" ADD VALUE 'brand-systems';
      EXCEPTION WHEN duplicate_object THEN NULL; END;

      BEGIN
        ALTER TYPE "public"."enum_insights_category" ADD VALUE 'founder-perspectives';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END$$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres does not support removing enum values directly.
  // A full type recreation would be needed; no-op here is safe.
  console.log('[migration down] enum_insights_category value removal is a no-op in Postgres.');
}
