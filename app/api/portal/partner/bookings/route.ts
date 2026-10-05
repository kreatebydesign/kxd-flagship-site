import { NextRequest, NextResponse } from "next/server";
import { gatePartnerApiSession } from "@/lib/portal/partner/access";
import {
  bookPartnerDiscoverySlot,
  listPartnerBookingsSafe,
  requestPartnerBookingChange,
} from "@/lib/portal/partner/calendar-booking";

export const dynamic = "force-dynamic";

export async function GET() {
  const gated = await gatePartnerApiSession();
  if (gated instanceof NextResponse) return gated;

  const bookings = await listPartnerBookingsSafe({ partnerId: gated.partnerId });
  return NextResponse.json({ ok: true, bookings });
}

export async function POST(req: NextRequest) {
  const gated = await gatePartnerApiSession({ write: true });
  if (gated instanceof NextResponse) return gated;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  // Change request path
  if (body.action === "reschedule" || body.action === "cancel") {
    const bookingId = Number(body.bookingId);
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return NextResponse.json({ ok: false, message: "Invalid booking." }, { status: 400 });
    }
    const result = await requestPartnerBookingChange({
      partnerId: gated.partnerId,
      bookingId,
      kind: body.action,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const relatedPartnerReferralId = Number(body.relatedPartnerReferralId);
  const slotStart = String(body.slotStart ?? "").trim();
  const slotEnd = String(body.slotEnd ?? "").trim();
  const timezone = String(body.timezone ?? "").trim();
  if (!Number.isFinite(relatedPartnerReferralId) || relatedPartnerReferralId <= 0) {
    return NextResponse.json({ ok: false, message: "Referral is required." }, { status: 400 });
  }
  if (!slotStart || !slotEnd || !timezone) {
    return NextResponse.json({ ok: false, message: "Slot details are required." }, { status: 400 });
  }

  const result = await bookPartnerDiscoverySlot({
    partnerId: gated.partnerId,
    partnerName: gated.displayName,
    data: {
      relatedPartnerReferralId,
      slotStart,
      slotEnd,
      timezone,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    bookingId: result.bookingId,
    reason: "reason" in result ? result.reason : null,
    reused: "reused" in result ? Boolean(result.reused) : false,
  });
}
