/**
 * Schema diagnostic route — call this from the browser or curl to confirm whether
 * the production database is missing FK columns in payload_locked_documents_rels.
 *
 * Usage: GET /api/admin/debug-schema
 *
 * Returns JSON with:
 *  - columns: list of _id FK columns present in payload_locked_documents_rels
 *  - missing: which KXD OS / Creative Engine FK columns are still absent
 *  - payloadCollections: slugs visible in the current Payload config (confirms runtime config)
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPECTED_CUSTOM_COLUMNS = [
  "project_inquiries_id",
  "clients_id",
  "retainers_id",
  "client_projects_id",
  "monthly_deliverables_id",
  "client_requests_id",
  "creative_campaigns_id",
  "brand_kits_id",
  "brand_kit_assets_id",
  "flyer_requests_id",
  "promo_video_requests_id",
  "social_post_requests_id",
  "creative_assets_id",
];

export async function GET() {
  try {
    const payload = await getPayload({ config });

    // 1 — Check actual DB columns in payload_locked_documents_rels
    const colResult = await payload.db.pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'payload_locked_documents_rels'
      ORDER BY column_name;
    `);

    const existingColumns: string[] = colResult.rows.map((r) => r.column_name);

    const presentCustom = EXPECTED_CUSTOM_COLUMNS.filter((c) =>
      existingColumns.includes(c)
    );
    const missingCustom = EXPECTED_CUSTOM_COLUMNS.filter(
      (c) => !existingColumns.includes(c)
    );

    // 2 — Confirm Payload runtime config includes custom collections
    const payloadCollections = payload.config.collections.map((c) => c.slug);

    // 3 — Try building the schema map for 'clients' to reproduce any buildFormState error
    let schemaMapCheck: Record<string, string> = {};
    try {
      const { buildFieldSchemaMap } = await import(
        // @ts-ignore — internal Payload UI utility
        "@payloadcms/ui/dist/utilities/buildFieldSchemaMap/index.js"
      );
      const { fieldSchemaMap } = buildFieldSchemaMap({
        collectionSlug: "clients",
        config: payload.config,
        globalSlug: undefined,
        i18n: { t: (k: string) => k } as any,
        widgetSlug: undefined,
      });
      schemaMapCheck["clients"] = fieldSchemaMap.has("clients")
        ? "FOUND"
        : "MISSING — buildFormState will throw 'Could not find clients in the fieldSchemaMap'";
    } catch (e: any) {
      schemaMapCheck["error"] = String(e?.message ?? e);
    }

    return NextResponse.json({
      ok: true,
      allColumnsPresent: missingCustom.length === 0,
      presentCustomColumns: presentCustom,
      missingCustomColumns: missingCustom,
      allColumnsInTable: existingColumns,
      payloadCollections,
      schemaMapCheck,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
