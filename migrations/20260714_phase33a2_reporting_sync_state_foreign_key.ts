/**
 * Phase 33A.2 — Enforce reporting_sync_states.client_id → clients.id integrity.
 *
 * Additive only. Does not rewrite Phase 33A / 33A.1 history.
 * Matches reporting_facts / client_infrastructure referential policy:
 *   FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Guarded add — safe when already present; fails loudly on real conflicts.
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'reporting_sync_states_client_id_fkey'
           OR conname = 'reporting_sync_states_client_id_fk'
      ) THEN
        ALTER TABLE "reporting_sync_states"
          ADD CONSTRAINT "reporting_sync_states_client_id_fkey"
          FOREIGN KEY ("client_id")
          REFERENCES "clients"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "reporting_sync_states"
      DROP CONSTRAINT IF EXISTS "reporting_sync_states_client_id_fkey";
  `);
  await db.execute(sql`
    ALTER TABLE "reporting_sync_states"
      DROP CONSTRAINT IF EXISTS "reporting_sync_states_client_id_fk";
  `);
}
