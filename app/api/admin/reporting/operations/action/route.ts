/**
 * Phase 33B / 33B.1 — Authenticated reporting operations mutations.
 * POST /api/admin/reporting/operations/action
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  executeReportingOpsAction,
  parseReportingOpsActionBody,
} from "@/lib/reporting/operations/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await requirePayloadAdminApi();
  if (admin instanceof NextResponse) return admin;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = parseReportingOpsActionBody(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { success: false, error: parsed.error },
      { status: 400 },
    );
  }

  const result = await executeReportingOpsAction(parsed);
  if (!result.ok) {
    const status =
      result.code === "confirmation-required" || result.code === "invalid"
        ? 400
        : result.code === "not-found"
          ? 404
          : result.code === "not-entitled"
            ? 403
            : result.code === "lease-active" || result.code === "not-applicable"
              ? 409
              : 500;
    return NextResponse.json(
      {
        success: false,
        ...result,
      },
      { status },
    );
  }

  return NextResponse.json({
    success: true,
    ...result,
  });
}
