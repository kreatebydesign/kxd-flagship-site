import { NextResponse } from "next/server";
import { requireStaffCapabilityApi, requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { isFounderOrAdmin } from "@/lib/staff/permissions";
import { staffDiscretionaryBonusErrorResponse } from "@/lib/staff-pay/bonuses/api-errors";
import { listStaffDiscretionaryBonusesForStaff } from "@/lib/staff-pay/bonuses/queries";
import { recordStaffDiscretionaryBonus } from "@/lib/staff-pay/bonuses/record";
import { STAFF_DISCRETIONARY_BONUS_DISCLAIMER } from "@/lib/staff-pay/bonuses/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedStaffId = Number(url.searchParams.get("staffUserId"));

  const gated = await requireStaffCapabilityReadApi("staff.time.read.self");
  if (gated instanceof NextResponse) return gated;

  let staffUserId = gated.actor.userId;

  if (Number.isFinite(requestedStaffId) && requestedStaffId > 0 && requestedStaffId !== staffUserId) {
    const ownerGate = await requireStaffCapabilityApi("admin.payroll.review", request);
    if (ownerGate instanceof NextResponse) {
      return NextResponse.json(
        { success: false, error: "Staff may only view their own bonuses." },
        { status: 403 },
      );
    }
    if (!isFounderOrAdmin(ownerGate.actor)) {
      return NextResponse.json(
        { success: false, error: "Only the owner may view another teammate's bonuses." },
        { status: 403 },
      );
    }
    staffUserId = requestedStaffId;
  }

  try {
    const bonuses = await listStaffDiscretionaryBonusesForStaff(staffUserId);
    return NextResponse.json({
      success: true,
      staffUserId,
      bonuses,
      disclaimer: STAFF_DISCRETIONARY_BONUS_DISCLAIMER,
    });
  } catch (error) {
    const mapped = staffDiscretionaryBonusErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  if (!isFounderOrAdmin(gated.actor)) {
    return NextResponse.json(
      { success: false, error: "Only the owner may record discretionary bonuses." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      staffUserId?: number;
      amountCents?: number;
      reason?: string;
      bonusDate?: string;
      idempotencyKey?: string;
    };

    const result = await recordStaffDiscretionaryBonus(gated.actor, {
      staffUserId: Number(body.staffUserId),
      amountCents: Number(body.amountCents),
      reason: String(body.reason ?? ""),
      bonusDate: String(body.bonusDate ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent,
      bonus: result.bonus,
      disclaimer: STAFF_DISCRETIONARY_BONUS_DISCLAIMER,
    });
  } catch (error) {
    const mapped = staffDiscretionaryBonusErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}