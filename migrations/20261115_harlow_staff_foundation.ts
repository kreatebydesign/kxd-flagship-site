/**
 * Harlow staff experience foundation — junior_studio_teammate role enum,
 * junior ↔ staff user link, discretionary bonus ledger (separate from hourly wage payments).
 * Additive only. Local apply until production migration is authorized.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_users_staff_role'
          AND e.enumlabel = 'junior_studio_teammate'
      ) THEN
        ALTER TYPE "public"."enum_users_staff_role"
          ADD VALUE 'junior_studio_teammate';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "junior_creator_users"
      ADD COLUMN IF NOT EXISTS "linked_staff_user_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'junior_creator_users_linked_staff_user_id_fk'
      ) THEN
        ALTER TABLE "junior_creator_users"
          ADD CONSTRAINT "junior_creator_users_linked_staff_user_id_fk"
          FOREIGN KEY ("linked_staff_user_id") REFERENCES "public"."users"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "junior_creator_users_linked_staff_user_id_idx"
      ON "junior_creator_users" USING btree ("linked_staff_user_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_discretionary_bonuses" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "amount_cents" integer NOT NULL,
      "reason" varchar NOT NULL,
      "bonus_date" date NOT NULL,
      "idempotency_key" varchar NOT NULL,
      "status" varchar NOT NULL DEFAULT 'active',
      "created_by_user_id" integer NOT NULL,
      "audit_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "staff_discretionary_bonuses_amount_positive" CHECK ("amount_cents" > 0),
      CONSTRAINT "staff_discretionary_bonuses_idempotency_unique"
        UNIQUE ("staff_user_id", "idempotency_key")
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_discretionary_bonuses_staff_user_id_fk'
      ) THEN
        ALTER TABLE "staff_discretionary_bonuses"
          ADD CONSTRAINT "staff_discretionary_bonuses_staff_user_id_fk"
          FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_discretionary_bonuses_created_by_user_id_fk'
      ) THEN
        ALTER TABLE "staff_discretionary_bonuses"
          ADD CONSTRAINT "staff_discretionary_bonuses_created_by_user_id_fk"
          FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
          ON DELETE no action ON UPDATE no action;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_discretionary_bonuses_staff_user_id_idx"
      ON "staff_discretionary_bonuses" USING btree ("staff_user_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_discretionary_bonuses" CASCADE;`);
  await db.execute(sql`
    DROP INDEX IF EXISTS "junior_creator_users_linked_staff_user_id_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "junior_creator_users"
      DROP CONSTRAINT IF EXISTS "junior_creator_users_linked_staff_user_id_fk";
  `);
  await db.execute(sql`
    ALTER TABLE "junior_creator_users" DROP COLUMN IF EXISTS "linked_staff_user_id";
  `);
}