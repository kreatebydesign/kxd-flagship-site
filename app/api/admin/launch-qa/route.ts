import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getLaunchQaPortfolio } from "@/lib/launch-qa";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const data = await getLaunchQaPortfolio();
  return NextResponse.json({ success: true, data });
}
