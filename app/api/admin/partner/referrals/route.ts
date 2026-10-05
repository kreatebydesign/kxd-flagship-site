import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  operatorListPartnerReferrals,
  operatorUpdatePartnerVisibility,
} from "@/lib/portal/partner/operator";
import { PARTNER_VISIBILITY_STATES } from "@/lib/portal/partner/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const referrals = await operatorListPartnerReferrals(100);
  const safe = referrals.map((doc) => ({
    id: doc.id,
    businessName: doc.businessName,
    contactName: doc.contactName,
    partnerVisibilityState: doc.partnerVisibilityState,
    sourcedByPartnerName: doc.sourcedByPartnerName,
    promotedSalesLead:
      typeof doc.promotedSalesLead === "number"
        ? doc.promotedSalesLead
        : doc.promotedSalesLead?.id ?? null,
    internalNotes: doc.internalNotes ?? null,
    createdAt: doc.createdAt,
  }));

  return NextResponse.json({ ok: true, referrals: safe });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    referralId?: number;
    visibilityState?: string;
  };
  const referralId = Number(body.referralId);
  const visibilityState = String(body.visibilityState ?? "");
  if (!Number.isFinite(referralId) || referralId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid referral." }, { status: 400 });
  }
  if (!(PARTNER_VISIBILITY_STATES as readonly string[]).includes(visibilityState)) {
    return NextResponse.json({ ok: false, error: "Invalid state." }, { status: 400 });
  }

  const result = await operatorUpdatePartnerVisibility({
    referralId,
    visibilityState: visibilityState as (typeof PARTNER_VISIBILITY_STATES)[number],
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
