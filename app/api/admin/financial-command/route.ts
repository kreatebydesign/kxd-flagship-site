import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { buildExecutiveFinancialMetrics } from "@/lib/financial-command/snapshots";
import { loadExecutiveFinancialWidget } from "@/lib/financial-command/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const payload = await getPayload({ config });
  const [executive, widget] = await Promise.all([
    buildExecutiveFinancialMetrics(payload),
    loadExecutiveFinancialWidget(),
  ]);

  return NextResponse.json({
    success: true,
    executive,
    widget,
    generatedAt: new Date().toISOString(),
  });
}
