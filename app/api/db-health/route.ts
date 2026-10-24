import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  classifyNeonDatabaseHost,
  resolvePayloadDatabaseHostname,
} from "@/lib/admin/database-target";
import { isStudioPayloadOperator } from "@/payload/access/index.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requirePayloadAdminApi(request);
  if (auth instanceof NextResponse) return auth;

  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { success: false, ok: false, error: "Studio operator access required." },
      { status: 403 },
    );
  }

  const rawUri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();
  const host = resolvePayloadDatabaseHostname();
  const classification = classifyNeonDatabaseHost(host);

  if (!rawUri) {
    return NextResponse.json({
      hasDatabaseUri: false,
      host: null,
      isProductionMain: false,
      isPreviewBranch: false,
      connected: false,
      now: null,
      error: "DATABASE_URI and DATABASE_URL are both unset",
    });
  }

  const client = new Client({
    connectionString: rawUri,
    connectionTimeoutMillis: 8_000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query<{ now: Date }>("SELECT NOW()");
    const now = result.rows[0]?.now ?? null;
    await client.end();

    return NextResponse.json({
      hasDatabaseUri: true,
      host: classification.host,
      isProductionMain: classification.isProductionMain,
      isPreviewBranch: classification.isPreviewBranch,
      connected: true,
      now,
      error: null,
    });
  } catch (err) {
    await client.end().catch(() => {});

    return NextResponse.json({
      hasDatabaseUri: true,
      host: classification.host,
      isProductionMain: classification.isProductionMain,
      isPreviewBranch: classification.isPreviewBranch,
      connected: false,
      now: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
