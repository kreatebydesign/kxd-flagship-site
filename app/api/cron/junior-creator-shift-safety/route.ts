/**
 * Cron — Junior Creator stale-shift failsafe.
 *
 * GET|POST /api/cron/junior-creator-shift-safety
 * Auth: Authorization: Bearer $CRON_SECRET (fail closed).
 *
 * Idempotent: concurrent runs lock rows and no-op already-stopped shifts.
 */
import { NextRequest, NextResponse } from "next/server";
import { sweepStaleJuniorShifts } from "@/lib/junior-creators/shift-auto-stop";
import {
  isAuthorizedCronBearer,
  resolveConfiguredCronSecret,
} from "@/lib/reporting/ingest/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
}

function authorizeCron(request: NextRequest): boolean {
  if (!resolveConfiguredCronSecret()) return false;
  return isAuthorizedCronBearer(request.headers.get("authorization"));
}

async function handle(request: NextRequest) {
  if (!authorizeCron(request)) return unauthorized();

  let dryRun = false;
  try {
    const text = await request.text();
    if (text.trim()) {
      const body = JSON.parse(text) as { dryRun?: boolean };
      dryRun = body.dryRun === true;
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      message: "Dry run only — no shifts mutated. Omit dryRun to sweep.",
    });
  }

  const summary = await sweepStaleJuniorShifts({
    source: "cron:junior-creator-shift-safety",
  });

  return NextResponse.json({
    success: true,
    authMode: "cron-secret",
    examined: summary.examined,
    stoppedCount: summary.stopped.length,
    alreadyStopped: summary.alreadyStopped,
    notDue: summary.notDue,
    stopped: summary.stopped,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
