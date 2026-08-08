/**
 * Additive: client service assignments + optional commercial relationship label.
 *
 * Safety:
 * - CREATE TABLE / ADD COLUMN / CREATE INDEX / CREATE TYPE only (IF NOT EXISTS).
 * - No DROP/ALTER of existing client or contract columns in up().
 * - Client FK is ON DELETE RESTRICT so deleting a Client cannot erase commercial history.
 * - Contract FK is ON DELETE SET NULL so a removed contract unlinks, it does not delete the assignment.
 * - Idempotent SQL for accidental re-run; Payload still records the name and runs up() once.
 *
 * Rollback (down) — not a production shipping path:
 * - Drops commercial_relationship_label only.
 * - Drops client_service_assignments and the three enums.
 * - Destructive to assignment history. Do not migrate:down in production.
 *
 * Local apply only until production migration is explicitly authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_service_assignments_capability_id'
      ) THEN
        CREATE TYPE "public"."enum_client_service_assignments_capability_id" AS ENUM(
          'managed_website',
          'seo_visibility',
          'analytics_reporting',
          'inventory_experience',
          'growth_strategy',
          'hosting_infrastructure',
          'lead_conversion',
          'google_ads_management',
          'active_growth_campaign',
          'performance_component'
        );
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_service_assignments_source'
      ) THEN
        CREATE TYPE "public"."enum_client_service_assignments_source" AS ENUM(
          'agreement', 'legacy-manual', 'included', 'add-on'
        );
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_client_service_assignments_status'
      ) THEN
        CREATE TYPE "public"."enum_client_service_assignments_status" AS ENUM(
          'active', 'ended', 'expired'
        );
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_service_assignments" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL,
      "capability_id" "public"."enum_client_service_assignments_capability_id" NOT NULL,
      "source" "public"."enum_client_service_assignments_source" DEFAULT 'legacy-manual' NOT NULL,
      "status" "public"."enum_client_service_assignments_status" DEFAULT 'active' NOT NULL,
      "effective_at" timestamp(3) with time zone,
      "ended_at" timestamp(3) with time zone,
      "related_contract_id" integer,
      "note" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_service_assignments_client_id_clients_id_fk'
      ) THEN
        ALTER TABLE "client_service_assignments"
          ADD CONSTRAINT "client_service_assignments_client_id_clients_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_service_assignments_related_contract_id_contracts_id_fk'
      ) THEN
        ALTER TABLE "client_service_assignments"
          ADD CONSTRAINT "client_service_assignments_related_contract_id_contracts_id_fk"
          FOREIGN KEY ("related_contract_id") REFERENCES "public"."contracts"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_service_assignments_client_status_idx"
      ON "client_service_assignments" USING btree ("client_id", "status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_service_assignments_client_capability_status_idx"
      ON "client_service_assignments" USING btree ("client_id", "capability_id", "status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_service_assignments_related_contract_idx"
      ON "client_service_assignments" USING btree ("related_contract_id");
  `);

  await db.execute(sql`
    ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "commercial_relationship_label" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients" DROP COLUMN IF EXISTS "commercial_relationship_label";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "client_service_assignments";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_service_assignments_capability_id";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_service_assignments_source";
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_client_service_assignments_status";
  `);
}
