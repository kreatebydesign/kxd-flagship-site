/**
 * Partner Portal referrals — submit + list own referrals only.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  gatePartnerApiSession,
} from "@/lib/portal/partner/access";
import {
  listPartnerReferrals,
  normalizePartnerReferralInput,
  submitPartnerReferral,
} from "@/lib/portal/partner/referrals";

export const dynamic = "force-dynamic";

export async function GET() {
  const gated = await gatePartnerApiSession();
  if (gated instanceof NextResponse) return gated;

  const leads = await listPartnerReferrals(gated.partnerId);
  return NextResponse.json({ ok: true, leads });
}

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

  // Never trust body partner ids — attribution is session-only.
  const normalized = normalizePartnerReferralInput(body);
  if (!normalized.ok) {
    return NextResponse.json(
      { ok: false, message: normalized.message },
      { status: 400 },
    );
  }

  const result = await submitPartnerReferral({
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

  return NextResponse.json({
    ok: true,
    referralId: result.referralId,
    salesLeadId: result.salesLeadId,
  });
}
