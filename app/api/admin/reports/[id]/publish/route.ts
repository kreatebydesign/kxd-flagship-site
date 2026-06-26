import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { publishMonthlyReport } from "@/lib/reporting/engine";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const report = await publishMonthlyReport(
    Number(id),
    typeof auth === "object" && auth !== null && "email" in auth ? String(auth.email) : undefined,
  );

  if (!report) {
    return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: report.id });
}
