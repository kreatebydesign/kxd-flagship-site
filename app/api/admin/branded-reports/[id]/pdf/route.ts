import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  BrandedReportError,
  generateBrandedReportPdf,
} from "@/lib/reporting/branded-client/lifecycle";

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
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const reportId = Number(id);
  const url = new URL(req.url);
  const clientId = Number(url.searchParams.get("clientId"));

  if (!Number.isFinite(reportId) || reportId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid report id." }, { status: 400 });
  }
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json(
      { success: false, error: "clientId query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const { buffer, filename } = await generateBrandedReportPdf(
      reportId,
      clientId,
      actorEmail(auth),
    );
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-KXD-Delivery": "manual-download-only",
      },
    });
  } catch (err) {
    if (err instanceof BrandedReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[branded-reports/pdf]", err);
    return NextResponse.json({ success: false, error: "Failed to generate PDF." }, { status: 500 });
  }
}
