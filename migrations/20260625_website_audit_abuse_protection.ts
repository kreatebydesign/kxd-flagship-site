/**
 * Website audit abuse protection — rate-limit attempt log (IP + timestamp).
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "website_audit_attempts" (
      "id"         serial PRIMARY KEY NOT NULL,
      "ip"         varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "website_audit_attempts_ip_created_at_idx"
      ON "website_audit_attempts" USING btree ("ip", "created_at" DESC);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "website_audit_attempts_ip_created_at_idx";
  `);
  await db.execute(sql`
    DROP TABLE IF EXISTS "website_audit_attempts" CASCADE;
  `);
}
