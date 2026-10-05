import { NextResponse } from "next/server";
import { gatePartnerApiSession } from "@/lib/portal/partner/access";
import { loadPartnerEarningsSummary } from "@/lib/portal/partner/earnings";

export const dynamic = "force-dynamic";

export async function GET() {
  const gated = await gatePartnerApiSession();
  if (gated instanceof NextResponse) return gated;

  const summary = await loadPartnerEarningsSummary(gated.partnerId);
  return NextResponse.json({ ok: true, summary });
}
