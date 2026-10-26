/**
 * Founder-only host diagnostic — no credentials, no live query required.
 * GET /api/admin/system/database-target
 */
import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  classifyNeonDatabaseHost,
  resolvePayloadDatabaseHostname,
} from "@/lib/admin/database-target";
import { resolveNodeRuntimeSecurityFields } from "@/lib/admin/node-runtime-security";
import { isStudioPayloadOperator } from "@/payload/access/index.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  const auth = await requirePayloadAdminApi(request);
  if (auth instanceof NextResponse) return auth;

  if (!isStudioPayloadOperator(auth)) {
    return jsonResponse(
      { success: false, error: "Studio operator access required." },
      403,
    );
  }

  const host = resolvePayloadDatabaseHostname();
  const classification = classifyNeonDatabaseHost(host);
  const rawUri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();

  let knProposalIdsPresent: number[] = [];
  let knProbeError: string | null = null;

  if (rawUri) {
    const client = new Client({
      connectionString: rawUri,
      connectionTimeoutMillis: 8_000,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      const result = await client.query<{ id: number }>(
        "SELECT id FROM proposals WHERE id = ANY($1::int[]) ORDER BY id",
        [[11, 12]],
      );
      knProposalIdsPresent = result.rows.map((row) => Number(row.id));
      await client.end();
    } catch (error) {
      await client.end().catch(() => {});
      knProbeError =
        error instanceof Error ? error.message : String(error);
    }
  }

  const { nodeRuntimeVersion, nodeRuntimeMeetsCve2026111497Minimum } =
    resolveNodeRuntimeSecurityFields();

  return jsonResponse({
    success: true,
    host: classification.host,
    isProductionMain: classification.isProductionMain,
    isPreviewBranch: classification.isPreviewBranch,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    knProposalIdsPresent,
    knProbeError,
    nodeRuntimeVersion,
    nodeRuntimeMeetsCve2026111497Minimum,
  });
}
