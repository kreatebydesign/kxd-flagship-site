import { NextResponse } from "next/server";
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
  const report = await getReportById(Number(id));
  if (!report || report.status !== "published") {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const clientId =
    typeof report.client === "object" && report.client !== null
      ? (report.client as { id: number }).id
      : report.client;

  if (clientId !== session.clientId) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  await recordPortalReportView(Number(id));
  return NextResponse.json({ success: true });
}
