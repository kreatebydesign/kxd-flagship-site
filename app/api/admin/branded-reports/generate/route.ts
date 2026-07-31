import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  BrandedReportError,
  generateBrandedClientReport,
} from "@/lib/reporting/branded-client/lifecycle";
import { isReportScopeCapability } from "@/lib/reporting/branded-client/scope";
import type { ReportScopeCapability } from "@/lib/reporting/branded-client/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function actorEmail(auth: unknown): string | null {
  if (auth && typeof auth === "object" && "email" in auth) {
    return String((auth as { email?: unknown }).email ?? "") || null;
  }
  return null;
}

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = Number(body.clientId);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid client id." }, { status: 400 });
  }

  // Scope cannot be unlocked via forged premium flags without operator identity.
  const rawCaps = Array.isArray(body.operatorCapabilities)
    ? body.operatorCapabilities
    : null;
  const operatorCapabilities = rawCaps
    ? (rawCaps.filter(isReportScopeCapability) as ReportScopeCapability[])
    : null;

  try {
    const { report, snapshot } = await generateBrandedClientReport({
      clientId,
      year: body.year != null ? Number(body.year) : 2026,
      month: body.month != null ? Number(body.month) : 7,
      startDay: body.startDay != null ? Number(body.startDay) : undefined,
      endDay: body.endDay != null ? Number(body.endDay) : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : null,
      operatorCapabilities,
      confirmedBy: operatorCapabilities ? actorEmail(auth) : null,
      preparedBy: actorEmail(auth),
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      approvalStatus: report.approvalStatus,
      periodLabel: snapshot.period.label,
      fingerprint: snapshot.fingerprint,
      clientId: snapshot.clientId,
    });
  } catch (err) {
    if (err instanceof BrandedReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[branded-reports/generate]", err);
    return NextResponse.json({ success: false, error: "Failed to generate report." }, { status: 500 });
  }
}
