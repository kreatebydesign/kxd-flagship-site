/**
 * KXD OS Phase 10A — Performance Reports (extends monthly_reports)
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_monthly_reports_report_type') THEN
        CREATE TYPE "public"."enum_monthly_reports_report_type"
          AS ENUM('google_ads', 'seo', 'website', 'monthly_marketing', 'analytics', 'custom');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_monthly_reports_status" ADD VALUE 'sent';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_monthly_reports_status" ADD VALUE 'archived';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_monthly_reports_next_month_strategy_priority') THEN
        CREATE TYPE "public"."enum_monthly_reports_next_month_strategy_priority"
          AS ENUM('low', 'medium', 'high');
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "monthly_reports"
      ADD COLUMN IF NOT EXISTS "report_type" "public"."enum_monthly_reports_report_type" DEFAULT 'monthly_marketing',
      ADD COLUMN IF NOT EXISTS "period_start" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "period_end" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "account_health_score" numeric,
      ADD COLUMN IF NOT EXISTS "client_facing_notes" varchar,
      ADD COLUMN IF NOT EXISTS "internal_notes" varchar;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_reports_campaign_performance" (
      "id" serial PRIMARY KEY NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "monthly_reports"("id") ON DELETE CASCADE,
      "_order" integer NOT NULL,
      "campaign_name" varchar NOT NULL,
      "impressions" numeric,
      "clicks" numeric,
      "ctr" numeric,
      "avg_cpc" numeric,
      "cost" numeric,
      "conversions" numeric,
      "notes" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_reports_geographic_performance" (
      "id" serial PRIMARY KEY NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "monthly_reports"("id") ON DELETE CASCADE,
      "_order" integer NOT NULL,
      "location" varchar NOT NULL,
      "impressions" numeric,
      "clicks" numeric,
      "ctr" numeric,
      "avg_cpc" numeric,
      "cost" numeric,
      "conversions" numeric,
      "notes" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_reports_top_search_terms" (
      "id" serial PRIMARY KEY NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "monthly_reports"("id") ON DELETE CASCADE,
      "_order" integer NOT NULL,
      "search_term" varchar NOT NULL,
      "insight" varchar,
      "recommendation" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_reports_optimization_work_completed" (
      "id" serial PRIMARY KEY NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "monthly_reports"("id") ON DELETE CASCADE,
      "_order" integer NOT NULL,
      "title" varchar NOT NULL,
      "description" varchar
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_reports_next_month_strategy" (
      "id" serial PRIMARY KEY NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "monthly_reports"("id") ON DELETE CASCADE,
      "_order" integer NOT NULL,
      "title" varchar NOT NULL,
      "priority" "public"."enum_monthly_reports_next_month_strategy_priority" DEFAULT 'medium',
      "description" varchar
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "monthly_reports_campaign_performance_order_idx"
      ON "monthly_reports_campaign_performance" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "monthly_reports_campaign_performance_parent_id_idx"
      ON "monthly_reports_campaign_performance" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "monthly_reports_geographic_performance_order_idx"
      ON "monthly_reports_geographic_performance" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "monthly_reports_geographic_performance_parent_id_idx"
      ON "monthly_reports_geographic_performance" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "monthly_reports_top_search_terms_order_idx"
      ON "monthly_reports_top_search_terms" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "monthly_reports_top_search_terms_parent_id_idx"
      ON "monthly_reports_top_search_terms" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "monthly_reports_optimization_work_completed_order_idx"
      ON "monthly_reports_optimization_work_completed" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "monthly_reports_optimization_work_completed_parent_id_idx"
      ON "monthly_reports_optimization_work_completed" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "monthly_reports_next_month_strategy_order_idx"
      ON "monthly_reports_next_month_strategy" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "monthly_reports_next_month_strategy_parent_id_idx"
      ON "monthly_reports_next_month_strategy" USING btree ("_parent_id");
  `);

  await db.execute(sql`
    DO $$
    DECLARE
      client_id_val integer;
      report_id_val integer;
    BEGIN
      SELECT id INTO client_id_val FROM clients WHERE slug = 'primal-motorsports' LIMIT 1;
      IF client_id_val IS NULL THEN
        RETURN;
      END IF;

      IF EXISTS (
        SELECT 1 FROM monthly_reports
        WHERE title = 'Google Ads Performance Report'
          AND client_id = client_id_val
      ) THEN
        RETURN;
      END IF;

      INSERT INTO monthly_reports (
        title,
        status,
        client_id,
        reporting_month,
        reporting_year,
        report_type,
        period_start,
        period_end,
        prepared_by,
        executive_summary,
        account_health_score,
        version
      ) VALUES (
        'Google Ads Performance Report',
        'ready'::"public"."enum_monthly_reports_status",
        client_id_val,
        6,
        2026,
        'google_ads'::"public"."enum_monthly_reports_report_type",
        '2026-06-06T00:00:00.000Z'::timestamptz,
        '2026-07-06T00:00:00.000Z'::timestamptz,
        'Kreate by Design',
        'The Google Ads account continues to perform well and remains in a healthy state following recent optimization work. Search traffic remains highly relevant with very little wasted spend, and no significant negative keyword opportunities were identified during the latest search terms audit. Florida targeting was recently added to begin testing demand in a new market. Initial traffic is encouraging, with Florida clicks coming in below the overall campaign average cost per click. Additional data will be collected before making optimization decisions.',
        9.3,
        1
      ) RETURNING id INTO report_id_val;

      INSERT INTO monthly_reports_campaign_performance
        (_parent_id, _order, campaign_name, impressions, clicks, ctr, avg_cpc, conversions)
      VALUES
        (report_id_val, 0, 'Bottom Funnel | Racing School', 3847, 229, 5.95, 10.53, 3),
        (report_id_val, 1, 'Demand Gen', 27267, 717, NULL, 0.83, 4);

      INSERT INTO monthly_reports_geographic_performance
        (_parent_id, _order, location, impressions, clicks, ctr, avg_cpc, cost, conversions, notes)
      VALUES
        (
          report_id_val, 0, 'Florida', 564, 23, 4.08, 7.73, 177.68, 0,
          'Recently added market. Early CPC is below campaign average. Continue gathering data before making optimization decisions.'
        ),
        (report_id_val, 1, 'Georgia', 204, 15, 7.35, 10.29, NULL, 1, NULL),
        (report_id_val, 2, '70-mile Atlanta Radius', 1232, 86, 6.98, 9.44, NULL, 2, NULL);

      INSERT INTO monthly_reports_top_search_terms
        (_parent_id, _order, search_term, insight)
      VALUES
        (report_id_val, 0, 'Racing School', 'Strong bottom-funnel intent.'),
        (report_id_val, 1, 'McLaren Driver Development Program', 'Potential keyword expansion opportunity.'),
        (report_id_val, 2, 'Road Atlanta Driving Schools', 'Highly relevant regional search.');

      INSERT INTO monthly_reports_optimization_work_completed
        (_parent_id, _order, title)
      VALUES
        (report_id_val, 0, 'Completed comprehensive search terms audit'),
        (report_id_val, 1, 'Confirmed search traffic remains highly targeted'),
        (report_id_val, 2, 'Confirmed no major wasted spend'),
        (report_id_val, 3, 'Audited conversion actions'),
        (report_id_val, 4, 'Verified GA4 lead conversion configuration'),
        (report_id_val, 5, 'Added Florida targeting'),
        (report_id_val, 6, 'Reviewed geographic performance'),
        (report_id_val, 7, 'Reviewed Google Ads recommendations'),
        (report_id_val, 8, 'Avoided unnecessary spend expansion recommendations'),
        (report_id_val, 9, 'Ongoing campaign monitoring');

      INSERT INTO monthly_reports_next_month_strategy
        (_parent_id, _order, title, priority)
      VALUES
        (report_id_val, 0, 'Continue Florida analysis', 'medium'::"public"."enum_monthly_reports_next_month_strategy_priority"),
        (report_id_val, 1, 'Review ad assets', 'medium'::"public"."enum_monthly_reports_next_month_strategy_priority"),
        (report_id_val, 2, 'Review landing page experience', 'medium'::"public"."enum_monthly_reports_next_month_strategy_priority"),
        (report_id_val, 3, 'Evaluate device performance', 'medium'::"public"."enum_monthly_reports_next_month_strategy_priority"),
        (report_id_val, 4, 'Continue keyword expansion only when justified by real search data', 'medium'::"public"."enum_monthly_reports_next_month_strategy_priority"),
        (report_id_val, 5, 'Continue conversion monitoring', 'medium'::"public"."enum_monthly_reports_next_month_strategy_priority");
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "monthly_reports_next_month_strategy" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "monthly_reports_optimization_work_completed" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "monthly_reports_top_search_terms" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "monthly_reports_geographic_performance" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "monthly_reports_campaign_performance" CASCADE;`);

  await db.execute(sql`
    ALTER TABLE "monthly_reports"
      DROP COLUMN IF EXISTS "internal_notes",
      DROP COLUMN IF EXISTS "client_facing_notes",
      DROP COLUMN IF EXISTS "account_health_score",
      DROP COLUMN IF EXISTS "period_end",
      DROP COLUMN IF EXISTS "period_start",
      DROP COLUMN IF EXISTS "report_type";
  `);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_monthly_reports_next_month_strategy_priority";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_monthly_reports_report_type";`);
}
