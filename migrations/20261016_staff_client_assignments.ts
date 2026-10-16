/**
 * Staff client assignments + business_development_specialist staff role enum value.
 * Additive only.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_users_staff_role'
          AND e.enumlabel = 'business_development_specialist'
      ) THEN
        ALTER TYPE "public"."enum_users_staff_role"
          ADD VALUE 'business_development_specialist';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_client_assignments" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "client_id" integer NOT NULL,
      "active" boolean DEFAULT true,
      "assigned_by_id" integer,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_client_assignments_staff_user_id_users_id_fk'
      ) THEN
        ALTER TABLE "staff_client_assignments"
          ADD CONSTRAINT "staff_client_assignments_staff_user_id_users_id_fk"
          FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_client_assignments_client_id_clients_id_fk'
      ) THEN
        ALTER TABLE "staff_client_assignments"
          ADD CONSTRAINT "staff_client_assignments_client_id_clients_id_fk"
          FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_client_assignments_assigned_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "staff_client_assignments"
          ADD CONSTRAINT "staff_client_assignments_assigned_by_id_users_id_fk"
          FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_client_assignments_staff_client_idx"
      ON "staff_client_assignments" ("staff_user_id", "client_id");
    CREATE INDEX IF NOT EXISTS "staff_client_assignments_staff_user_idx"
      ON "staff_client_assignments" ("staff_user_id");
    CREATE INDEX IF NOT EXISTS "staff_client_assignments_client_idx"
      ON "staff_client_assignments" ("client_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "staff_client_assignments" CASCADE;
  `);
  /* enum value cannot be removed safely in Postgres — left in place on down */
}
