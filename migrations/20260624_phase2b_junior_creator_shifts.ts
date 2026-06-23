/**
 * KXD OS Phase 2B — Junior Creator shift tracking
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'enum_junior_creator_shifts_status' AND typnamespace = 'public'::regnamespace
      ) THEN
        CREATE TYPE "public"."enum_junior_creator_shifts_status"
          AS ENUM('active', 'completed', 'voided');
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "junior_creator_shifts" (
      "id"                        serial PRIMARY KEY NOT NULL,
      "junior_creator_user_id"    integer NOT NULL,
      "started_at"                timestamp(3) with time zone NOT NULL,
      "ended_at"                  timestamp(3) with time zone,
      "total_minutes"             numeric,
      "week_key"                  varchar NOT NULL,
      "hourly_rate_cents"         numeric NOT NULL,
      "status"                    "public"."enum_junior_creator_shifts_status" DEFAULT 'active' NOT NULL,
      "notes"                     varchar,
      "updated_at"                timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"                timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'junior_creator_shifts_junior_creator_user_id_fk'
          AND table_name = 'junior_creator_shifts'
      ) THEN
        ALTER TABLE "junior_creator_shifts"
          ADD CONSTRAINT "junior_creator_shifts_junior_creator_user_id_fk"
          FOREIGN KEY ("junior_creator_user_id")
          REFERENCES "public"."junior_creator_users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "junior_creator_shifts_junior_creator_user_id_idx"
      ON "junior_creator_shifts" USING btree ("junior_creator_user_id");
    CREATE INDEX IF NOT EXISTS "junior_creator_shifts_week_key_idx"
      ON "junior_creator_shifts" USING btree ("week_key");
    CREATE INDEX IF NOT EXISTS "junior_creator_shifts_status_idx"
      ON "junior_creator_shifts" USING btree ("status");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "junior_creator_shifts_status_idx";
    DROP INDEX IF EXISTS "junior_creator_shifts_week_key_idx";
    DROP INDEX IF EXISTS "junior_creator_shifts_junior_creator_user_id_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "junior_creator_shifts"
      DROP CONSTRAINT IF EXISTS "junior_creator_shifts_junior_creator_user_id_fk";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "junior_creator_shifts" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_junior_creator_shifts_status";
  `);
}
