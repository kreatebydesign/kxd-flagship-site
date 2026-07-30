import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  AuditReportError,
  associateAuditClient,
} from "@/lib/website-audit-report/lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  let clientId: number | null = null;
  try {
    const body = await req.json();
    if (body?.clientId === null || body?.clientId === "") {
      clientId = null;
    } else {
      clientId = Number(body?.clientId);
      if (!Number.isFinite(clientId) || clientId <= 0) {
        return NextResponse.json({ success: false, error: "Invalid client id." }, { status: 400 });
      }
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await associateAuditClient(auditId, clientId);
    return NextResponse.json({
      success: true,
      clientId: result.source.clientId ?? clientId,
      canonicalWebsiteUrl: result.canonicalClientUrl,
    });
  } catch (err) {
    if (err instanceof AuditReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[website-audit-report/associate-client]", err);
    return NextResponse.json(
      { success: false, error: "Failed to associate client." },
      { status: 500 },
    );
  }
}
