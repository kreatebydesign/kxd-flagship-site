/**
 * KXD OS Phase 8C — Client Communications Layer
 * client_communications
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_communications_type') THEN
        CREATE TYPE "public"."enum_client_communications_type"
          AS ENUM('email', 'call', 'meeting', 'text', 'note', 'form_submission', 'campaign_update', 'support_followup');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_communications_direction') THEN
        CREATE TYPE "public"."enum_client_communications_direction"
          AS ENUM('inbound', 'outbound', 'internal');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_communications_status') THEN
        CREATE TYPE "public"."enum_client_communications_status"
          AS ENUM('logged', 'needs_reply', 'replied', 'resolved', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_client_communications_priority') THEN
        CREATE TYPE "public"."enum_client_communications_priority"
          AS ENUM('low', 'normal', 'high', 'urgent');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_communications" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "type" "public"."enum_client_communications_type" DEFAULT 'email' NOT NULL,
      "direction" "public"."enum_client_communications_direction" DEFAULT 'outbound' NOT NULL,
      "status" "public"."enum_client_communications_status" DEFAULT 'logged' NOT NULL,
      "priority" "public"."enum_client_communications_priority" DEFAULT 'normal' NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "follow_up_date" timestamp(3) with time zone,
      "subject" varchar,
      "summary" varchar,
      "body_preview" varchar,
      "contact_name" varchar,
      "contact_email" varchar,
      "source" varchar,
      "related_project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "related_request_id" integer REFERENCES "client_requests"("id") ON DELETE SET NULL,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_communications_participants" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "client_communications"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar,
      "email" varchar
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_communications_client_idx" ON "client_communications" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_communications_type_idx" ON "client_communications" USING btree ("type");
    CREATE INDEX IF NOT EXISTS "client_communications_status_idx" ON "client_communications" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "client_communications_priority_idx" ON "client_communications" USING btree ("priority");
    CREATE INDEX IF NOT EXISTS "client_communications_date_idx" ON "client_communications" USING btree ("date");
    CREATE INDEX IF NOT EXISTS "client_communications_follow_up_date_idx" ON "client_communications" USING btree ("follow_up_date");
    CREATE INDEX IF NOT EXISTS "client_communications_updated_at_idx" ON "client_communications" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "client_communications_created_at_idx" ON "client_communications" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "client_communications_related_project_idx" ON "client_communications" USING btree ("related_project_id");
    CREATE INDEX IF NOT EXISTS "client_communications_related_request_idx" ON "client_communications" USING btree ("related_request_id");
    CREATE INDEX IF NOT EXISTS "client_communications_participants_order_idx" ON "client_communications_participants" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "client_communications_participants_parent_id_idx" ON "client_communications_participants" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "client_communications_participants" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_communications" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_communications_priority";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_communications_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_communications_direction";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_communications_type";`);
}
