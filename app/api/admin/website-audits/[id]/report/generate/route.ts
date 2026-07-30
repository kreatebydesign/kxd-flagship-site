import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  AuditReportError,
  generateAuditReport,
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

  let force = false;
  try {
    const body = await req.json();
    force = Boolean(body?.force);
  } catch {
    force = false;
  }

  try {
    const result = await generateAuditReport(auditId, {
      force,
      actorEmail: actorEmail(auth),
    });
    return NextResponse.json({
      success: true,
      reportStatus: result.source.reportStatus,
      canonical: result.canonical,
    });
  } catch (err) {
    if (err instanceof AuditReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[website-audit-report/generate]", err);
    return NextResponse.json({ success: false, error: "Failed to generate report." }, { status: 500 });
  }
}
