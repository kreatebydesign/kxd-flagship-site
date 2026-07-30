import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  AuditReportError,
  reopenAuditReport,
} from "@/lib/website-audit-report/lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isFinite(auditId) || auditId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid audit id." }, { status: 400 });
  }

  try {
    const result = await reopenAuditReport(auditId);
    return NextResponse.json({
      success: true,
      reportStatus: result.source.reportStatus,
      canonical: result.canonical,
    });
  } catch (err) {
    if (err instanceof AuditReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[website-audit-report/reopen]", err);
    return NextResponse.json({ success: false, error: "Failed to reopen report." }, { status: 500 });
  }
}
