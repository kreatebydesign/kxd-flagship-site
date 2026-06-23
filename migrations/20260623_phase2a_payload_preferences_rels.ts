/**
 * Fix: payload_preferences_rels missing portal_users_id / junior_creator_users_id.
 *
 * Payload 3 registers FK columns on payload_preferences_rels for every auth-enabled
 * collection. Without them, admin list views query non-existent columns → 500.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_preferences_rels"
      ADD COLUMN IF NOT EXISTS "portal_users_id" integer,
      ADD COLUMN IF NOT EXISTS "junior_creator_users_id" integer;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_preferences_rels_portal_users_fk'
          AND table_name = 'payload_preferences_rels'
      ) THEN
        ALTER TABLE "payload_preferences_rels"
          ADD CONSTRAINT "payload_preferences_rels_portal_users_fk"
          FOREIGN KEY ("portal_users_id")
          REFERENCES "public"."portal_users"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_preferences_rels_junior_creator_users_fk'
          AND table_name = 'payload_preferences_rels'
      ) THEN
        ALTER TABLE "payload_preferences_rels"
          ADD CONSTRAINT "payload_preferences_rels_junior_creator_users_fk"
          FOREIGN KEY ("junior_creator_users_id")
          REFERENCES "public"."junior_creator_users"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END$$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_portal_users_id_idx"
      ON "payload_preferences_rels" USING btree ("portal_users_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_junior_creator_users_id_idx"
      ON "payload_preferences_rels" USING btree ("junior_creator_users_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_preferences_rels_portal_users_id_idx";
    DROP INDEX IF EXISTS "payload_preferences_rels_junior_creator_users_id_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_preferences_rels"
      DROP CONSTRAINT IF EXISTS "payload_preferences_rels_portal_users_fk",
      DROP CONSTRAINT IF EXISTS "payload_preferences_rels_junior_creator_users_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_preferences_rels"
      DROP COLUMN IF EXISTS "portal_users_id",
      DROP COLUMN IF EXISTS "junior_creator_users_id";
  `);
}
