import { NextResponse } from "next/server";
import { requireStaffCapabilityApi, requireStaffCapabilityReadApi } from "@/lib/staff/guard";
import { isFounderOrAdmin } from "@/lib/staff/permissions";
import { staffEmploymentComplianceErrorResponse } from "@/lib/staff-employment/compliance-api-errors";
import {
  loadStaffEmploymentCompliance,
  upsertStaffEmploymentCompliance,
} from "@/lib/staff-employment/compliance-data";
import { STAFF_COMPLIANCE_DISCLAIMER } from "@/lib/staff-employment/compliance-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const staffUserId = Number(url.searchParams.get("staffUserId"));
  if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
    return NextResponse.json(
      { success: false, error: "staffUserId is required." },
      { status: 400 },
    );
  }

  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;
  if (!isFounderOrAdmin(gated.actor)) {
    return NextResponse.json(
      { success: false, error: "Only the owner may view employment compliance records." },
      { status: 403 },
    );
  }

  try {
    const record = await loadStaffEmploymentCompliance(staffUserId);
    return NextResponse.json({
      success: true,
      staffUserId,
      record,
      disclaimer: STAFF_COMPLIANCE_DISCLAIMER,
    });
  } catch (error) {
    const mapped = staffEmploymentComplianceErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}

export async function PUT(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;
  if (!isFounderOrAdmin(gated.actor)) {
    return NextResponse.json(
      { success: false, error: "Only the owner may update employment compliance records." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const record = await upsertStaffEmploymentCompliance(gated.actor, {
      staffUserId: Number(body.staffUserId),
      employmentAuthorizationStatus: String(
        body.employmentAuthorizationStatus ?? "pending",
      ) as "pending" | "authorized" | "blocked" | "expired",
      oregonPermitConfirmed: Boolean(body.oregonPermitConfirmed),
      permitEffectiveDate: body.permitEffectiveDate
        ? String(body.permitEffectiveDate).slice(0, 10)
        : null,
      permitExpirationDate: body.permitExpirationDate
        ? String(body.permitExpirationDate).slice(0, 10)
        : null,
      approvedWorkCategories: Array.isArray(body.approvedWorkCategories)
        ? body.approvedWorkCategories.map((c) => String(c))
        : [],
      schoolDayMaxMinutes:
        body.schoolDayMaxMinutes != null ? Number(body.schoolDayMaxMinutes) : null,
      nonSchoolDayMaxMinutes:
        body.nonSchoolDayMaxMinutes != null ? Number(body.nonSchoolDayMaxMinutes) : null,
      weeklyMaxMinutes: body.weeklyMaxMinutes != null ? Number(body.weeklyMaxMinutes) : null,
      schoolDayEarliestStartLocal: body.schoolDayEarliestStartLocal
        ? String(body.schoolDayEarliestStartLocal)
        : null,
      schoolDayLatestEndLocal: body.schoolDayLatestEndLocal
        ? String(body.schoolDayLatestEndLocal)
        : null,
      nonSchoolDayEarliestStartLocal: body.nonSchoolDayEarliestStartLocal
        ? String(body.nonSchoolDayEarliestStartLocal)
        : null,
      nonSchoolDayLatestEndLocal: body.nonSchoolDayLatestEndLocal
        ? String(body.nonSchoolDayLatestEndLocal)
        : null,
      schedulingRules:
        body.schedulingRules && typeof body.schedulingRules === "object"
          ? (body.schedulingRules as Record<string, unknown>)
          : {},
      paidShiftActivation: body.paidShiftActivation === "allowed" ? "allowed" : "blocked",
      payrollSetupConfirmed: Boolean(body.payrollSetupConfirmed),
      ownerHourlyRateConfirmed: Boolean(body.ownerHourlyRateConfirmed),
      ownerComplianceNote: body.ownerComplianceNote ? String(body.ownerComplianceNote) : null,
    });

    return NextResponse.json({
      success: true,
      record,
      disclaimer: STAFF_COMPLIANCE_DISCLAIMER,
    });
  } catch (error) {
    const mapped = staffEmploymentComplianceErrorResponse(error);
    return NextResponse.json(
      { success: false, error: mapped.message },
      { status: mapped.status },
    );
  }
}