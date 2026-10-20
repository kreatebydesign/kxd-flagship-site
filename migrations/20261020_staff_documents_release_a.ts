/**
 * Release A — Staff document templates, assignments, and private file registry.
 * Additive. Local/dev migration — apply per Matt's release process.
 */
import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_document_templates" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar,
      "version" numeric NOT NULL DEFAULT 1,
      "kind" varchar NOT NULL DEFAULT 'policy-acknowledgment',
      "status" varchar NOT NULL DEFAULT 'draft',
      "legal_entity_name" varchar DEFAULT 'Kreate by Design LLC',
      "body" varchar NOT NULL,
      "content_hash" varchar,
      "approved_at" timestamp(3) with time zone,
      "approved_by" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_documents" (
      "id" serial PRIMARY KEY NOT NULL,
      "staff_user_id" integer NOT NULL,
      "template_id" integer,
      "template_version" numeric NOT NULL DEFAULT 1,
      "template_content_hash" varchar NOT NULL,
      "title" varchar NOT NULL,
      "kind" varchar NOT NULL DEFAULT 'policy-acknowledgment',
      "status" varchar NOT NULL DEFAULT 'assigned',
      "legal_entity_name" varchar NOT NULL,
      "body_snapshot" varchar NOT NULL,
      "acknowledgment" jsonb,
      "acknowledged_at" timestamp(3) with time zone,
      "audit_events" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "staff_document_files" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "kind" varchar NOT NULL,
      "staff_document_id" integer NOT NULL,
      "staff_user_id" integer NOT NULL,
      "content_hash" varchar NOT NULL,
      "storage_key" varchar NOT NULL,
      "storage_provider" varchar DEFAULT 'local',
      "mime_type" varchar NOT NULL DEFAULT 'application/pdf',
      "byte_length" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_documents"
        ADD CONSTRAINT "staff_documents_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_documents"
        ADD CONSTRAINT "staff_documents_template_id_staff_document_templates_id_fk"
        FOREIGN KEY ("template_id") REFERENCES "public"."staff_document_templates"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_document_files"
        ADD CONSTRAINT "staff_document_files_staff_document_id_staff_documents_id_fk"
        FOREIGN KEY ("staff_document_id") REFERENCES "public"."staff_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "staff_document_files"
        ADD CONSTRAINT "staff_document_files_staff_user_id_users_id_fk"
        FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_documents_staff_user_status_idx"
      ON "staff_documents" ("staff_user_id", "status");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "staff_document_files_doc_kind_hash_idx"
      ON "staff_document_files" ("staff_document_id", "kind", "content_hash");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "staff_document_files" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_documents" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "staff_document_templates" CASCADE;`);
}
