import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  AuditReportError,
  getAuditReportPdf,
} from "@/lib/website-audit-report/lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function actorEmail(auth: unknown): string | null {
  if (auth && typeof auth === "object" && "email" in auth) {
    return String((auth as { email?: unknown }).email ?? "") || null;
  }
  return null;
}

export async function GET(
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
    const { buffer, filename } = await getAuditReportPdf(auditId, actorEmail(auth));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuditReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[website-audit-report/pdf]", err);
    return NextResponse.json({ success: false, error: "Failed to generate PDF." }, { status: 500 });
  }
}
