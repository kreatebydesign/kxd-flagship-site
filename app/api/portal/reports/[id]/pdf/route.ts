import { NextResponse } from "next/server";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { decidePortalReportAccess } from "@/lib/portal/analytics-visibility";
import { isBatchGClientHqSurfaceAvailable } from "@/lib/portal/requests-files-reports";
import { getPortalSession } from "@/lib/portal/session";
import {
  BrandedReportError,
  getPortalBrandedReportPdf,
} from "@/lib/reporting/branded-client/lifecycle";
import { getReportById } from "@/lib/reporting/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const profile = await resolveExperienceProfile(session);
  if (!isBatchGClientHqSurfaceAvailable("reports", profile)) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isFinite(reportId) || reportId <= 0) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const report = await getReportById(reportId);
  const access = decidePortalReportAccess({
    report,
    authorizedClientId: session.clientId,
  });
  if (!access.ok || !report) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  try {
    const { buffer, filename } = await getPortalBrandedReportPdf(
      reportId,
      session.clientId,
    );
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-KXD-Delivery": "portal-authenticated-download",
      },
    });
  } catch (err) {
    if (err instanceof BrandedReportError) {
      const status = err.status === 403 || err.status === 404 ? 404 : err.status;
      return NextResponse.json({ success: false, error: "Not found." }, { status });
    }
    console.error("[portal/reports/pdf]", err);
    return NextResponse.json({ success: false, error: "Failed to generate PDF." }, { status: 500 });
  }
}
