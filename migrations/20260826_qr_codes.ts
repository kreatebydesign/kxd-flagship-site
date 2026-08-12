/**
 * Additive: QR Generator V1 metadata collection (no image blobs).
 *
 * Safety:
 * - CREATE TABLE / CREATE INDEX only (IF NOT EXISTS).
 * - Soft FK references to clients / users (SET NULL on delete).
 * - Idempotent SQL for accidental re-run.
 *
 * Local apply only until production migration is explicitly authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_qr_codes_error_correction_level'
      ) THEN
        CREATE TYPE "public"."enum_qr_codes_error_correction_level" AS ENUM('L', 'M', 'Q', 'H');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "qr_codes" (
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar,
      "destination_url" varchar NOT NULL,
      "client_id" integer,
      "created_by_id" integer,
      "error_correction_level" "public"."enum_qr_codes_error_correction_level" DEFAULT 'H' NOT NULL,
      "width" numeric DEFAULT 1024 NOT NULL,
      "margin" numeric DEFAULT 4 NOT NULL,
      "version" varchar DEFAULT 'v1' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'qr_codes_client_id_clients_id_fk'
      ) THEN
        ALTER TABLE "qr_codes"
          ADD CONSTRAINT "qr_codes_client_id_clients_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'qr_codes_created_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "qr_codes"
          ADD CONSTRAINT "qr_codes_created_by_id_users_id_fk"
          FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "qr_codes_destination_url_idx" ON "qr_codes" ("destination_url");
    CREATE INDEX IF NOT EXISTS "qr_codes_client_idx" ON "qr_codes" ("client_id");
    CREATE INDEX IF NOT EXISTS "qr_codes_created_by_idx" ON "qr_codes" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "qr_codes_created_at_idx" ON "qr_codes" ("created_at");
    CREATE INDEX IF NOT EXISTS "qr_codes_updated_at_idx" ON "qr_codes" ("updated_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "qr_codes" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_qr_codes_error_correction_level";
  `);
}
