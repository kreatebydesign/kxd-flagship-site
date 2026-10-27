/**
 * Platform Economics V1 — founder-only valuation snapshot store.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "platform_economics_snapshots" (
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "calculation_version" varchar NOT NULL DEFAULT 'v1',
      "captured_at" timestamp(3) with time zone NOT NULL,
      "source_fingerprint" varchar NOT NULL,
      "inputs" jsonb NOT NULL,
      "outputs" jsonb NOT NULL,
      "milestone_notes" jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "platform_economics_snapshots_captured_at_idx"
    ON "platform_economics_snapshots" ("captured_at" DESC);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "platform_economics_snapshots";`);
}
