import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  AuditReportError,
  approveAuditReport,
} from "@/lib/website-audit-report/lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function actorEmail(auth: unknown): string | null {
  if (auth && typeof auth === "object" && "email" in auth) {
    return String((auth as { email?: unknown }).email ?? "") || null;
  }
  return null;
}

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
    const result = await approveAuditReport(auditId, actorEmail(auth));
    return NextResponse.json({
      success: true,
      reportStatus: result.source.reportStatus,
      approvedAt: result.source.reportApprovedAt,
      approvedBy: result.source.reportApprovedBy,
      canonical: result.canonical,
    });
  } catch (err) {
    if (err instanceof AuditReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[website-audit-report/approve]", err);
    return NextResponse.json({ success: false, error: "Failed to approve report." }, { status: 500 });
  }
}
