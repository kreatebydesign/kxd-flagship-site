/**
 * Phase 33A / 33A.1 — Automated multi-client reporting sweep.
 *
 * POST|GET /api/cron/reporting-sweep
 * Auth: Authorization: Bearer $CRON_SECRET only (fail closed if secret absent/blank).
 *
 * Vercel cron schedule is hourly (`0 * * * *`). Due work is decided in Shared Core
 * via America/Los_Angeles + nextScheduledSyncAt — never by server-local time.
 */

import { NextRequest, NextResponse } from "next/server";
import { runReportingAutomationSweep } from "@/lib/reporting/automation/server";
import {
  isAuthorizedCronBearer,
  resolveConfiguredCronSecret,
} from "@/lib/reporting/ingest/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized." },
    { status: 401 },
  );
}

function authorizeCron(request: NextRequest): boolean {
  // Fail closed: missing/blank CRON_SECRET never authenticates.
  if (!resolveConfiguredCronSecret()) return false;
  return isAuthorizedCronBearer(request.headers.get("authorization"));
}

async function handle(request: NextRequest) {
  if (!authorizeCron(request)) {
    return unauthorized();
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const summary = await runReportingAutomationSweep({
    dryRun: body.dryRun === true,
    force: body.force === true,
    clientId:
      typeof body.clientId === "number"
        ? body.clientId
        : typeof body.clientId === "string" && body.clientId.trim()
          ? Number(body.clientId)
          : null,
    clientSlug:
      typeof body.clientSlug === "string" ? body.clientSlug.trim() : null,
  });

  return NextResponse.json({
    success: true,
    authMode: "cron-secret",
    summary: {
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
      dryRun: summary.dryRun,
      force: summary.force,
      clientsConsidered: summary.clientsConsidered,
      clientsRun: summary.clientsRun,
      clientsSkippedCapacity: summary.clientsSkippedCapacity,
      providerAttempts: summary.providerAttempts,
      providerSynced: summary.providerSynced,
      providerFailed: summary.providerFailed,
      providerSkipped: summary.providerSkipped,
      providerDeferred: summary.providerDeferred,
      truncated: summary.truncated,
      warnings: summary.warnings,
      clients: summary.clients.map((client) => ({
        clientId: client.clientId,
        clientSlug: client.clientSlug,
        clientName: client.clientName,
        providers: client.providers.map((p) => ({
          provider: p.provider,
          outcome: p.outcome,
          integrationStatus: p.integrationStatus,
          ok: p.ok,
          deferred: p.deferred,
          factsWritten: p.factsWritten,
          message: p.message,
          windowId: p.windowId,
          nextScheduledSyncAt: p.nextScheduledSyncAt,
          countsAsFailure: p.countsAsFailure,
        })),
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

/** Vercel Cron invokes GET — identical fail-closed auth + sweep semantics. */
export async function GET(request: NextRequest) {
  return handle(request);
}
