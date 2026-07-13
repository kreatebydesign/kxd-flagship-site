/**
 * Phase 31C — Protected admin reporting facts ingest.
 * Runs in Vercel production so OIDC can mint Google tokens.
 *
 * POST /api/admin/reporting/ingest
 * Auth: Payload admin session (cookie) OR Authorization: Bearer $CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authorizeReportingIngest,
  parseReportingIngestBody,
  syncReportingFacts,
} from "@/lib/reporting/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toHttpStatus(outcome: string): number {
  switch (outcome) {
    case "synced":
    case "synced-empty":
      return 200;
    case "skipped":
      return 200;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "invalid":
      return 400;
    case "unavailable":
      return 503;
    default:
      return 500;
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeReportingIngest(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = parseReportingIngestBody(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { success: false, error: parsed.error },
      { status: 400 },
    );
  }

  const result = await syncReportingFacts(parsed);

  return NextResponse.json(
    {
      success: result.ok,
      authMode: auth.mode,
      outcome: result.outcome,
      provider: result.provider,
      clientId: result.clientId,
      clientSlug: result.clientSlug,
      clientName: result.clientName,
      requestedPeriod: result.requestedPeriod,
      effectivePeriod: result.effectivePeriod,
      providerStatus: result.providerStatus,
      factsFetched: result.factsFetched,
      factsWritten: result.factsWritten,
      factsCreated: result.factsCreated,
      factsUpdated: result.factsUpdated,
      message: result.message,
      warnings: result.warnings,
    },
    { status: toHttpStatus(result.outcome) },
  );
}
