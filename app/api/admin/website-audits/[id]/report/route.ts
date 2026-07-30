import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  AuditReportError,
  saveAuditReport,
} from "@/lib/website-audit-report/lifecycle";
import type { ReportSaveInput } from "@/lib/website-audit-report/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isFinite(auditId) || auditId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid audit id." }, { status: 400 });
  }

  let body: ReportSaveInput;
  try {
    body = (await req.json()) as ReportSaveInput;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await saveAuditReport(auditId, body);
    return NextResponse.json({
      success: true,
      reportStatus: result.source.reportStatus,
      canonical: result.canonical,
    });
  } catch (err) {
    if (err instanceof AuditReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[website-audit-report/save]", err);
    return NextResponse.json({ success: false, error: "Failed to save report." }, { status: 500 });
  }
}
