/**
 * Additive: revenue-events enum values for Direct Agreement execution +
 * external payment reconciliation provenance.
 *
 * Does not mutate commercial data. Postgres cannot remove enum values in down().
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      BEGIN
        ALTER TYPE "public"."enum_revenue_events_event_type"
          ADD VALUE 'revenue.contract-executed';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TYPE "public"."enum_revenue_events_event_type"
          ADD VALUE 'revenue.external-payment-recorded';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot remove enum values safely without recreating the type.
  void db;
}
