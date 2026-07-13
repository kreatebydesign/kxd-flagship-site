/**
 * Phase 31C — Authorization for reporting ingest routes.
 * Admin Payload session (primary) or CRON_SECRET bearer (cron-ready).
 */

import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isAuthorizedCronBearer } from "./cron-auth";

export type ReportingIngestAuthMode = "admin-session" | "cron-secret";

export type ReportingIngestAuthOk = {
  ok: true;
  mode: ReportingIngestAuthMode;
};

export type ReportingIngestAuthFail = {
  ok: false;
  response: NextResponse;
};

function unauthorized(): ReportingIngestAuthFail {
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    ),
  };
}

/**
 * Protect admin reporting ingest.
 * - Valid Payload administrator session, OR
 * - Explicitly valid Bearer CRON_SECRET when CRON_SECRET is configured.
 * Fail closed for absent / blank / malformed / incorrect secrets.
 * Portal sessions are never accepted (requirePayloadAdminApi).
 */
export async function authorizeReportingIngest(
  request: NextRequest,
): Promise<ReportingIngestAuthOk | ReportingIngestAuthFail> {
  if (isAuthorizedCronBearer(request.headers.get("authorization"))) {
    return { ok: true, mode: "cron-secret" };
  }

  const admin = await requirePayloadAdminApi();
  if (admin instanceof NextResponse) {
    return unauthorized();
  }

  return { ok: true, mode: "admin-session" };
}
