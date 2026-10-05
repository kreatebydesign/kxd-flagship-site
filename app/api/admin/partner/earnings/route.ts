import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  operatorCreateEarning,
  operatorTransitionEarning,
} from "@/lib/portal/partner/operator";
import type { PartnerEarningType } from "@/lib/portal/partner/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Record<string, unknown>;
  const result = await operatorCreateEarning({
    partnerId: Number(body.partnerId),
    earningType: String(body.earningType) as PartnerEarningType,
    relatedBusinessName: String(body.relatedBusinessName ?? ""),
    amountCents: Number(body.amountCents),
    rateBps: body.rateBps != null ? Number(body.rateBps) : undefined,
    eligibleCollectedCents:
      body.eligibleCollectedCents != null
        ? Number(body.eligibleCollectedCents)
        : undefined,
    relevantMonth:
      typeof body.relevantMonth === "string" ? body.relevantMonth : undefined,
    coveredServiceMonth:
      body.coveredServiceMonth != null
        ? Number(body.coveredServiceMonth)
        : undefined,
    relatedSalesLeadId:
      body.relatedSalesLeadId != null ? Number(body.relatedSalesLeadId) : undefined,
    relatedPartnerReferralId:
      body.relatedPartnerReferralId != null
        ? Number(body.relatedPartnerReferralId)
        : undefined,
    operatorNotes:
      typeof body.operatorNotes === "string" ? body.operatorNotes : undefined,
    paymentStatus: "pending_approval",
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    earningId?: number;
    status?: "approved" | "paid" | "void";
    operatorNotes?: string;
  };
  const earningId = Number(body.earningId);
  if (!Number.isFinite(earningId) || !body.status) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const result = await operatorTransitionEarning({
    earningId,
    status: body.status,
    approvedBy:
      auth && typeof auth === "object" && "email" in auth && auth.email
        ? String(auth.email)
        : "operator",
    operatorNotes: body.operatorNotes,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
