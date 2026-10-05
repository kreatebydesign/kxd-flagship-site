import { NextResponse } from "next/server";
import { gatePartnerApiSession } from "@/lib/portal/partner/access";
import { listPartnerDiscoverySlots } from "@/lib/portal/partner/calendar-booking";

export const dynamic = "force-dynamic";

export async function GET() {
  const gated = await gatePartnerApiSession();
  if (gated instanceof NextResponse) return gated;

  const result = await listPartnerDiscoverySlots();
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 500 });
  }

  // Never expose calendar ids, tokens, or busy blocks.
  return NextResponse.json({
    ok: true,
    available: result.available,
    reason: "reason" in result ? result.reason : null,
    slots: result.slots,
  });
}
