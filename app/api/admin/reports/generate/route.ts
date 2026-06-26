import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { generateMonthlyReport } from "@/lib/reporting/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const clientId = Number(body.clientId);
    const month = Number(body.month);
    const year = Number(body.year);

    if (!clientId || !month || !year) {
      return NextResponse.json({ success: false, error: "Client, month, and year required." }, { status: 400 });
    }

    const result = await generateMonthlyReport({
      clientId,
      month,
      year,
      templateSlug: body.templateSlug,
      preparedBy: typeof auth === "object" && auth !== null && "email" in auth ? String(auth.email) : "KXD Operations",
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, reportId: result.reportId });
  } catch (err) {
    console.error("[KXD Reporting] Generate failed:", err);
    return NextResponse.json({ success: false, error: "Report generation failed." }, { status: 500 });
  }
}
