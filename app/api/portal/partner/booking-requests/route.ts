import { NextRequest, NextResponse } from "next/server";
import { gatePartnerApiSession } from "@/lib/portal/partner/access";
import {
  normalizePartnerBookingInput,
  submitPartnerBookingRequest,
} from "@/lib/portal/partner/booking";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gated = await gatePartnerApiSession({ write: true });
  if (gated instanceof NextResponse) return gated;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const normalized = normalizePartnerBookingInput(body);
  if (!normalized.ok) {
    return NextResponse.json(
      { ok: false, message: normalized.message },
      { status: 400 },
    );
  }

  const result = await submitPartnerBookingRequest({
    partnerId: gated.partnerId,
    partnerName: gated.displayName,
    data: normalized.data,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}
