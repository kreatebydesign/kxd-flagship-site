/**
 * Phase 31C — Cron-ready reporting ingest entry (same Shared Core orchestrator).
 *
 * POST /api/cron/reporting-ingest
 * Auth: Authorization: Bearer $CRON_SECRET only (fail closed if secret absent).
 *
 * Add to vercel.json later without rewriting ingestion:
 * { "path": "/api/cron/reporting-ingest", "schedule": "0 14 * * *" }
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronBearer } from "@/lib/reporting/ingest/cron-auth";
import {
  parseReportingIngestBody,
  syncReportingFacts,
} from "@/lib/reporting/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Fail closed: absent, blank, malformed, or incorrect CRON_SECRET → 401.
  if (!isAuthorizedCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
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
  return NextResponse.json({
    success: result.ok,
    authMode: "cron-secret",
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
  });
}
