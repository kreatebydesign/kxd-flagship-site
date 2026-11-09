import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { staffWagePaymentErrorResponse } from "@/lib/staff-pay/wage-payments/api-errors";
import { listUnsettledPayableSourcesForStaff } from "@/lib/staff-pay/wage-payments/list-payable-sources";
import { loadStaffWageSettlementSummary } from "@/lib/staff-pay/wage-payments/load-settlement";
import { recordStaffWagePayment } from "@/lib/staff-pay/wage-payments/record";
import { listStaffWagePaymentsForStaff } from "@/lib/staff-pay/wage-payments/queries";
import type { StaffWagePayableSourceRef, StaffWagePaymentMethod } from "@/lib/staff-pay/wage-payments/types";
import { WAGE_PAYMENT_DISCLAIMER } from "@/lib/staff-pay/wage-payments/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  const url = new URL(request.url);
  const staffUserId = Number(url.searchParams.get("staffUserId"));
  if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
    return NextResponse.json(
      { success: false, error: "staffUserId is required." },
      { status: 400 },
    );
  }

  try {
    const [payments, settlement, unsettled] = await Promise.all([
      listStaffWagePaymentsForStaff(staffUserId),
      loadStaffWageSettlementSummary(staffUserId),
      listUnsettledPayableSourcesForStaff(staffUserId),
    ]);
    return NextResponse.json({
      success: true,
      staffUserId,
      payments,
      settlement,
      unsettled,
      disclaimer: WAGE_PAYMENT_DISCLAIMER,
    });
  } catch (error) {
    const mapped = staffWagePaymentErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;

  try {
    const body = (await request.json()) as {
      staffUserId?: number;
      paymentMethod?: StaffWagePaymentMethod;
      officialPayrollDate?: string;
      settledAt?: string;
      externalReference?: string;
      ownerNote?: string | null;
      allocations?: StaffWagePayableSourceRef[];
    };

    if (!body.staffUserId || !body.externalReference || !body.allocations?.length) {
      return NextResponse.json(
        { success: false, error: "staffUserId, externalReference, and allocations are required." },
        { status: 400 },
      );
    }

    const result = await recordStaffWagePayment(gated.actor, {
      staffUserId: Number(body.staffUserId),
      paymentMethod: body.paymentMethod ?? "other",
      officialPayrollDate: String(body.officialPayrollDate ?? "").slice(0, 10),
      settledAt: String(body.settledAt ?? new Date().toISOString()),
      externalReference: String(body.externalReference),
      ownerNote: body.ownerNote ?? null,
      allocations: body.allocations,
    });

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent,
      payment: result.payment,
      allocationCount: result.allocations,
      disclaimer: WAGE_PAYMENT_DISCLAIMER,
    });
  } catch (error) {
    const mapped = staffWagePaymentErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}
