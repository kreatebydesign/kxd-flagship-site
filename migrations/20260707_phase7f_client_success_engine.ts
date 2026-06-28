/**
 * KXD Core Phase 7F — Client Success Engine
 * client_success_plans, success_check_ins
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_success_check_ins_satisfaction') THEN
        CREATE TYPE "public"."enum_success_check_ins_satisfaction"
          AS ENUM('poor', 'fair', 'good', 'high', 'excellent');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_success_plans" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "account_manager_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "success_score" numeric,
      "renewal_date" timestamp(3) with time zone,
      "next_review" timestamp(3) with time zone,
      "current_focus" varchar,
      "quarterly_goals" varchar,
      "yearly_goals" varchar,
      "care_plan" varchar,
      "risks" varchar,
      "opportunities" varchar,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "success_check_ins" (
      "id" serial PRIMARY KEY NOT NULL,
      "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE SET NULL,
      "meeting_date" timestamp(3) with time zone NOT NULL,
      "satisfaction" "public"."enum_success_check_ins_satisfaction",
      "completed" boolean DEFAULT false,
      "follow_up_date" timestamp(3) with time zone,
      "summary" varchar,
      "wins" varchar,
      "blockers" varchar,
      "action_items" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_success_plans_client_idx" ON "client_success_plans" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "client_success_plans_account_manager_idx" ON "client_success_plans" USING btree ("account_manager_id");
    CREATE INDEX IF NOT EXISTS "client_success_plans_renewal_date_idx" ON "client_success_plans" USING btree ("renewal_date");
    CREATE INDEX IF NOT EXISTS "client_success_plans_next_review_idx" ON "client_success_plans" USING btree ("next_review");
    CREATE INDEX IF NOT EXISTS "client_success_plans_success_score_idx" ON "client_success_plans" USING btree ("success_score");
    CREATE INDEX IF NOT EXISTS "client_success_plans_updated_at_idx" ON "client_success_plans" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "client_success_plans_created_at_idx" ON "client_success_plans" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "success_check_ins_client_idx" ON "success_check_ins" USING btree ("client_id");
    CREATE INDEX IF NOT EXISTS "success_check_ins_meeting_date_idx" ON "success_check_ins" USING btree ("meeting_date");
    CREATE INDEX IF NOT EXISTS "success_check_ins_follow_up_date_idx" ON "success_check_ins" USING btree ("follow_up_date");
    CREATE INDEX IF NOT EXISTS "success_check_ins_completed_idx" ON "success_check_ins" USING btree ("completed");
    CREATE INDEX IF NOT EXISTS "success_check_ins_updated_at_idx" ON "success_check_ins" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "success_check_ins_created_at_idx" ON "success_check_ins" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "success_check_ins" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_success_plans" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_success_check_ins_satisfaction";`);
}
