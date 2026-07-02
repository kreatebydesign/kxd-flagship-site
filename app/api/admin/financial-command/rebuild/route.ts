import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { rebuildFinancialSnapshots } from "@/lib/financial-command/rebuild";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const payload = await getPayload({ config });
  const result = await rebuildFinancialSnapshots(payload);
  return NextResponse.json({ success: true, ...result });
}
