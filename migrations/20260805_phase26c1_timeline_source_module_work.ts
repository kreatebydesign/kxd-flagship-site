/**
 * Phase 26C.1 — Add missing Executive Timeline source_module enum values.
 *
 * Root cause: Payload collection + TypeScript include `Work` (and other modules),
 * but Neon enum `enum_executive_timeline_events_source_module` never received them.
 * Only `Executive Notes` was added via migration (20260704). Scheduling audit
 * publishes with sourceModule: "Work", which failed inserts and soft-failed.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Client Command';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Client Intelligence';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Projects';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Requests';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Sales';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Retainers';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Client Success';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Emails';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Communications';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_executive_timeline_events_source_module" ADD VALUE 'Work';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot remove enum values safely without recreating the type.
  void db;
}
