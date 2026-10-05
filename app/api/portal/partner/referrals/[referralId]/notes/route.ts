import { NextRequest, NextResponse } from "next/server";
import { gatePartnerApiSession } from "@/lib/portal/partner/access";
import { addPartnerReferralNote, listPartnerReferralNotes } from "@/lib/portal/partner/notes";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ referralId: string }> },
) {
  const gated = await gatePartnerApiSession();
  if (gated instanceof NextResponse) return gated;

  const { referralId: raw } = await ctx.params;
  const referralId = Number(raw);
  if (!Number.isFinite(referralId) || referralId <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid referral." }, { status: 400 });
  }

  const notes = await listPartnerReferralNotes({
    partnerId: gated.partnerId,
    referralId,
  });
  return NextResponse.json({ ok: true, notes });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ referralId: string }> },
) {
  const gated = await gatePartnerApiSession({ write: true });
  if (gated instanceof NextResponse) return gated;

  const { referralId: raw } = await ctx.params;
  const referralId = Number(raw);
  if (!Number.isFinite(referralId) || referralId <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid referral." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const result = await addPartnerReferralNote({
    partnerId: gated.partnerId,
    partnerName: gated.displayName,
    actorDisplayName: gated.displayName,
    referralId,
    body: String(body.body ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.message === "Referral not found." ? 404 : 400 },
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}
