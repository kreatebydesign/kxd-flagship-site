import { NextResponse } from "next/server";
import { Client } from "pg";
import { requirePayloadAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const rawUri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();

  if (!rawUri) {
    return NextResponse.json({
      hasDatabaseUri: false,
      host: null,
      connected: false,
      now: null,
      error: "DATABASE_URI and DATABASE_URL are both unset",
    });
  }

  // Extract host only — never expose credentials or full URL.
  let host: string | null = null;
  try {
    const url = new URL(rawUri);
    host = url.hostname;
  } catch {
    host = "(unparseable)";
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
      host,
      connected: true,
      now,
      error: null,
    });
  } catch (err) {
    await client.end().catch(() => {});

    return NextResponse.json({
      hasDatabaseUri: true,
      host,
      connected: false,
      now: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
