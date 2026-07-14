/**
 * Phase 34B — Client Inventory Vehicles (reusable module).
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_inventory_vehicles_condition" AS ENUM('new', 'used');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_inventory_vehicles_listing_status" AS ENUM('draft', 'available', 'pending', 'sold', 'hidden', 'coming_soon');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_client_inventory_vehicles_price_display_mode" AS ENUM('exact', 'contact', 'call', 'hidden');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_inventory_vehicles" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "year" numeric,
      "make" varchar NOT NULL,
      "model" varchar NOT NULL,
      "trim" varchar,
      "condition" "enum_client_inventory_vehicles_condition" DEFAULT 'used' NOT NULL,
      "listing_status" "enum_client_inventory_vehicles_listing_status" DEFAULT 'draft' NOT NULL,
      "price" numeric,
      "price_display_mode" "enum_client_inventory_vehicles_price_display_mode" DEFAULT 'exact',
      "mileage" numeric,
      "vin" varchar,
      "stock_number" varchar,
      "summary" varchar,
      "description" varchar,
      "featured" boolean DEFAULT false,
      "sort_order" numeric DEFAULT 0,
      "published_at" timestamp(3) with time zone,
      "sold_at" timestamp(3) with time zone,
      "external_url" varchar,
      "created_by" varchar,
      "updated_by" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_inventory_vehicles_specifications" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "value" varchar NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_inventory_vehicles_highlights" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "client_inventory_vehicles_gallery" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" integer NOT NULL
    );
  `);

  try {
    await db.execute(sql`
      ALTER TABLE "client_inventory_vehicles"
        ADD COLUMN IF NOT EXISTS "client_id" integer;
    `);
  } catch {
    /* exists */
  }
  try {
    await db.execute(sql`
      ALTER TABLE "client_inventory_vehicles"
        ADD COLUMN IF NOT EXISTS "primary_image_id" integer;
    `);
  } catch {
    /* exists */
  }

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'client_inventory_vehicles_client_id_clients_id_fk'
        ) THEN
          ALTER TABLE "client_inventory_vehicles"
            ADD CONSTRAINT "client_inventory_vehicles_client_id_clients_id_fk"
            FOREIGN KEY ("client_id") REFERENCES "clients"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal */
  }

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'client_inventory_vehicles_primary_image_id_media_id_fk'
        ) THEN
          ALTER TABLE "client_inventory_vehicles"
            ADD CONSTRAINT "client_inventory_vehicles_primary_image_id_media_id_fk"
            FOREIGN KEY ("primary_image_id") REFERENCES "media"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal */
  }

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'client_inventory_vehicles_specifications_parent_id_fk'
        ) THEN
          ALTER TABLE "client_inventory_vehicles_specifications"
            ADD CONSTRAINT "client_inventory_vehicles_specifications_parent_id_fk"
            FOREIGN KEY ("_parent_id") REFERENCES "client_inventory_vehicles"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal */
  }

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'client_inventory_vehicles_highlights_parent_id_fk'
        ) THEN
          ALTER TABLE "client_inventory_vehicles_highlights"
            ADD CONSTRAINT "client_inventory_vehicles_highlights_parent_id_fk"
            FOREIGN KEY ("_parent_id") REFERENCES "client_inventory_vehicles"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal */
  }

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'client_inventory_vehicles_gallery_parent_id_fk'
        ) THEN
          ALTER TABLE "client_inventory_vehicles_gallery"
            ADD CONSTRAINT "client_inventory_vehicles_gallery_parent_id_fk"
            FOREIGN KEY ("_parent_id") REFERENCES "client_inventory_vehicles"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal */
  }

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'client_inventory_vehicles_gallery_image_id_media_id_fk'
        ) THEN
          ALTER TABLE "client_inventory_vehicles_gallery"
            ADD CONSTRAINT "client_inventory_vehicles_gallery_image_id_media_id_fk"
            FOREIGN KEY ("image_id") REFERENCES "media"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  } catch {
    /* non-fatal */
  }

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "client_inventory_vehicles_client_slug_uidx"
      ON "client_inventory_vehicles" ("client_id", "slug");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_client_idx"
      ON "client_inventory_vehicles" ("client_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_listing_status_idx"
      ON "client_inventory_vehicles" ("listing_status");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_sort_order_idx"
      ON "client_inventory_vehicles" ("sort_order");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_specifications_order_idx"
      ON "client_inventory_vehicles_specifications" ("_order");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_specifications_parent_id_idx"
      ON "client_inventory_vehicles_specifications" ("_parent_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_highlights_order_idx"
      ON "client_inventory_vehicles_highlights" ("_order");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_highlights_parent_id_idx"
      ON "client_inventory_vehicles_highlights" ("_parent_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_gallery_order_idx"
      ON "client_inventory_vehicles_gallery" ("_order");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_gallery_parent_id_idx"
      ON "client_inventory_vehicles_gallery" ("_parent_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "client_inventory_vehicles_gallery_image_idx"
      ON "client_inventory_vehicles_gallery" ("image_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "client_inventory_vehicles_gallery" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_inventory_vehicles_highlights" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_inventory_vehicles_specifications" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "client_inventory_vehicles" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_inventory_vehicles_price_display_mode";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_inventory_vehicles_listing_status";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_client_inventory_vehicles_condition";`);
}
