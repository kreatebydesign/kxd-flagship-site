import { NextResponse } from "next/server";
import { decidePortalReportAccess } from "@/lib/portal/analytics-visibility";
import { getPortalSession } from "@/lib/portal/session";
import { getReportById, recordPortalReportView } from "@/lib/reporting/engine";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
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

  // Uniform denial for forged / cross-client report ids.
  if (!access.ok) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  await recordPortalReportView(reportId);
  return NextResponse.json({ success: true });
}
