/**
 * Fix: payload_locked_documents_rels missing columns for KXD OS & Creative Engine collections.
 *
 * Root cause: The initial Payload-generated migration created payload_locked_documents_rels
 * with _id columns only for the original 12 collections. Every collection added afterward
 * via manual migrations (clients, retainers, client_projects, monthly_deliverables,
 * client_requests, project_inquiries, and all 7 Creative Engine collections) was missing
 * its FK column. When Payload's admin attempts to open a document edit page it calls
 * renderDocument() which tries to create a document lock — the INSERT into
 * payload_locked_documents_rels references a non-existent column, throws a DB error,
 * gets swallowed silently by Payload's catch block, and returns undefined → blank page.
 *
 * Fix: Add the 13 missing _id columns, their FK constraints, and indexes.
 * All statements are idempotent (ADD COLUMN IF NOT EXISTS / DO $$ guards / IF NOT EXISTS).
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. Add missing columns ────────────────────────────────────────────────

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "project_inquiries_id"   integer,
      ADD COLUMN IF NOT EXISTS "clients_id"             integer,
      ADD COLUMN IF NOT EXISTS "retainers_id"           integer,
      ADD COLUMN IF NOT EXISTS "client_projects_id"     integer,
      ADD COLUMN IF NOT EXISTS "monthly_deliverables_id" integer,
      ADD COLUMN IF NOT EXISTS "client_requests_id"     integer,
      ADD COLUMN IF NOT EXISTS "creative_campaigns_id"  integer,
      ADD COLUMN IF NOT EXISTS "brand_kits_id"          integer,
      ADD COLUMN IF NOT EXISTS "brand_kit_assets_id"    integer,
      ADD COLUMN IF NOT EXISTS "flyer_requests_id"      integer,
      ADD COLUMN IF NOT EXISTS "promo_video_requests_id" integer,
      ADD COLUMN IF NOT EXISTS "social_post_requests_id" integer,
      ADD COLUMN IF NOT EXISTS "creative_assets_id"     integer;
  `);

  // ── 2. Add FK constraints (idempotent via DO block) ───────────────────────

  await db.execute(sql`
    DO $$
    BEGIN

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_project_inquiries_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_project_inquiries_fk"
          FOREIGN KEY ("project_inquiries_id")
          REFERENCES "public"."project_inquiries"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_clients_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_clients_fk"
          FOREIGN KEY ("clients_id")
          REFERENCES "public"."clients"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_retainers_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_retainers_fk"
          FOREIGN KEY ("retainers_id")
          REFERENCES "public"."retainers"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_client_projects_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_client_projects_fk"
          FOREIGN KEY ("client_projects_id")
          REFERENCES "public"."client_projects"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_monthly_deliverables_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_monthly_deliverables_fk"
          FOREIGN KEY ("monthly_deliverables_id")
          REFERENCES "public"."monthly_deliverables"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_client_requests_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_client_requests_fk"
          FOREIGN KEY ("client_requests_id")
          REFERENCES "public"."client_requests"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_creative_campaigns_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_creative_campaigns_fk"
          FOREIGN KEY ("creative_campaigns_id")
          REFERENCES "public"."creative_campaigns"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_brand_kits_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_brand_kits_fk"
          FOREIGN KEY ("brand_kits_id")
          REFERENCES "public"."brand_kits"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_brand_kit_assets_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_brand_kit_assets_fk"
          FOREIGN KEY ("brand_kit_assets_id")
          REFERENCES "public"."brand_kit_assets"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_flyer_requests_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_flyer_requests_fk"
          FOREIGN KEY ("flyer_requests_id")
          REFERENCES "public"."flyer_requests"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_promo_video_requests_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_promo_video_requests_fk"
          FOREIGN KEY ("promo_video_requests_id")
          REFERENCES "public"."promo_video_requests"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_social_post_requests_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_social_post_requests_fk"
          FOREIGN KEY ("social_post_requests_id")
          REFERENCES "public"."social_post_requests"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_creative_assets_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_creative_assets_fk"
          FOREIGN KEY ("creative_assets_id")
          REFERENCES "public"."creative_assets"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;

    END$$;
  `);

  // ── 3. Add indexes ────────────────────────────────────────────────────────

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_project_inquiries_id_idx"
      ON "payload_locked_documents_rels" USING btree ("project_inquiries_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_clients_id_idx"
      ON "payload_locked_documents_rels" USING btree ("clients_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_retainers_id_idx"
      ON "payload_locked_documents_rels" USING btree ("retainers_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_client_projects_id_idx"
      ON "payload_locked_documents_rels" USING btree ("client_projects_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_monthly_deliverables_id_idx"
      ON "payload_locked_documents_rels" USING btree ("monthly_deliverables_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_client_requests_id_idx"
      ON "payload_locked_documents_rels" USING btree ("client_requests_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_creative_campaigns_id_idx"
      ON "payload_locked_documents_rels" USING btree ("creative_campaigns_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_brand_kits_id_idx"
      ON "payload_locked_documents_rels" USING btree ("brand_kits_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_brand_kit_assets_id_idx"
      ON "payload_locked_documents_rels" USING btree ("brand_kit_assets_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_flyer_requests_id_idx"
      ON "payload_locked_documents_rels" USING btree ("flyer_requests_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_promo_video_requests_id_idx"
      ON "payload_locked_documents_rels" USING btree ("promo_video_requests_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_social_post_requests_id_idx"
      ON "payload_locked_documents_rels" USING btree ("social_post_requests_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_creative_assets_id_idx"
      ON "payload_locked_documents_rels" USING btree ("creative_assets_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "project_inquiries_id",
      DROP COLUMN IF EXISTS "clients_id",
      DROP COLUMN IF EXISTS "retainers_id",
      DROP COLUMN IF EXISTS "client_projects_id",
      DROP COLUMN IF EXISTS "monthly_deliverables_id",
      DROP COLUMN IF EXISTS "client_requests_id",
      DROP COLUMN IF EXISTS "creative_campaigns_id",
      DROP COLUMN IF EXISTS "brand_kits_id",
      DROP COLUMN IF EXISTS "brand_kit_assets_id",
      DROP COLUMN IF EXISTS "flyer_requests_id",
      DROP COLUMN IF EXISTS "promo_video_requests_id",
      DROP COLUMN IF EXISTS "social_post_requests_id",
      DROP COLUMN IF EXISTS "creative_assets_id";
  `);
}
