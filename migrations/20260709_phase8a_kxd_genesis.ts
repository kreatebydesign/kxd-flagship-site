/**
 * KXD Core Phase 8A — KXD Genesis
 * genesis_sessions
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_genesis_sessions_template_id') THEN
        CREATE TYPE "public"."enum_genesis_sessions_template_id"
          AS ENUM(
            'standard-business', 'contractor', 'motorsports', 'restaurant',
            'hospitality', 'political-campaign', 'professional-services', 'creative-agency'
          );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_genesis_sessions_status') THEN
        CREATE TYPE "public"."enum_genesis_sessions_status"
          AS ENUM('draft', 'in-progress', 'blueprints-ready', 'completed', 'archived');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_genesis_sessions_current_phase') THEN
        CREATE TYPE "public"."enum_genesis_sessions_current_phase"
          AS ENUM(
            'business-foundation', 'brand-strategy', 'website-strategy', 'seo-strategy',
            'business-systems', 'production-planning', 'launch-planning'
          );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_genesis_sessions_blueprint_status') THEN
        CREATE TYPE "public"."enum_genesis_sessions_blueprint_status"
          AS ENUM('pending', 'generated', 'applied');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "genesis_sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "session_label" varchar NOT NULL,
      "template_id" "public"."enum_genesis_sessions_template_id" DEFAULT 'standard-business' NOT NULL,
      "status" "public"."enum_genesis_sessions_status" DEFAULT 'draft' NOT NULL,
      "current_phase" "public"."enum_genesis_sessions_current_phase" DEFAULT 'business-foundation' NOT NULL,
      "progress_percent" numeric DEFAULT 0,
      "launch_readiness" numeric DEFAULT 0,
      "blueprint_status" "public"."enum_genesis_sessions_blueprint_status" DEFAULT 'pending' NOT NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
      "project_id" integer REFERENCES "client_projects"("id") ON DELETE SET NULL,
      "created_by_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "completed_at" timestamp(3) with time zone,
      "recommended_next_step" varchar,
      "missing_fields" jsonb,
      "discovery_data" jsonb NOT NULL,
      "blueprints" jsonb,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "genesis_sessions_client_idx" ON "genesis_sessions" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "genesis_sessions_project_idx" ON "genesis_sessions" USING btree ("project_id");
    CREATE INDEX IF NOT EXISTS "genesis_sessions_status_idx" ON "genesis_sessions" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "genesis_sessions_template_id_idx" ON "genesis_sessions" USING btree ("template_id");
    CREATE INDEX IF NOT EXISTS "genesis_sessions_blueprint_status_idx" ON "genesis_sessions" USING btree ("blueprint_status");
    CREATE INDEX IF NOT EXISTS "genesis_sessions_updated_at_idx" ON "genesis_sessions" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "genesis_sessions_created_at_idx" ON "genesis_sessions" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "genesis_sessions" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_genesis_sessions_blueprint_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_genesis_sessions_current_phase";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_genesis_sessions_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_genesis_sessions_template_id";`);
}
