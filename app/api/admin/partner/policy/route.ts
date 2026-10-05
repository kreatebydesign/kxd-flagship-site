import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  operatorGetPolicy,
  operatorUpdatePolicy,
} from "@/lib/portal/partner/operator";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  const policy = await operatorGetPolicy();
  return NextResponse.json({ ok: true, policy });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const result = await operatorUpdatePolicy({
    projectRateBps:
      body.projectRateBps != null ? Number(body.projectRateBps) : undefined,
    monthlyRateBps:
      body.monthlyRateBps != null ? Number(body.monthlyRateBps) : undefined,
    monthlyBonusMonths:
      body.monthlyBonusMonths != null ? Number(body.monthlyBonusMonths) : undefined,
    retentionKickerEnabled:
      typeof body.retentionKickerEnabled === "boolean"
        ? body.retentionKickerEnabled
        : undefined,
    retentionKickerRateBps:
      body.retentionKickerRateBps != null
        ? Number(body.retentionKickerRateBps)
        : undefined,
    retentionKickerMonth:
      body.retentionKickerMonth != null
        ? Number(body.retentionKickerMonth)
        : undefined,
    eligibleRecurringServices:
      typeof body.eligibleRecurringServices === "string"
        ? body.eligibleRecurringServices
        : undefined,
    performanceBonusEnabled:
      typeof body.performanceBonusEnabled === "boolean"
        ? body.performanceBonusEnabled
        : undefined,
    performanceBonusAmountCents:
      body.performanceBonusAmountCents != null
        ? Number(body.performanceBonusAmountCents)
        : undefined,
    performanceBonusProjectCount:
      body.performanceBonusProjectCount != null
        ? Number(body.performanceBonusProjectCount)
        : undefined,
    performanceBonusWindowDays:
      body.performanceBonusWindowDays != null
        ? Number(body.performanceBonusWindowDays)
        : undefined,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
