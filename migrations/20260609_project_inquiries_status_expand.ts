import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Add expanded pipeline status values to project_inquiries.
// Uses exception-safe DO block; existing records are preserved.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      BEGIN
        ALTER TYPE "public"."enum_project_inquiries_status" ADD VALUE 'onboarding';
      EXCEPTION WHEN duplicate_object THEN NULL; END;

      BEGIN
        ALTER TYPE "public"."enum_project_inquiries_status" ADD VALUE 'retainer';
      EXCEPTION WHEN duplicate_object THEN NULL; END;

      BEGIN
        ALTER TYPE "public"."enum_project_inquiries_status" ADD VALUE 'paused';
      EXCEPTION WHEN duplicate_object THEN NULL; END;

      BEGIN
        ALTER TYPE "public"."enum_project_inquiries_status" ADD VALUE 'completed';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END$$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres does not support removing enum values; no-op is safe.
  console.log('[migration down] enum_project_inquiries_status value removal is a no-op in Postgres.');
}
