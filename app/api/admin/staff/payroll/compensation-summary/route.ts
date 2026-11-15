import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { isFounderOrAdmin } from "@/lib/staff/permissions";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  loadStaffAnnualCompensationSummary,
  staffAnnualCompensationSummaryToCsv,
} from "@/lib/staff-pay/compensation-annual-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.payroll.review", request);
  if (gated instanceof NextResponse) return gated;
  if (!isFounderOrAdmin(gated.actor)) {
    return NextResponse.json(
      { success: false, error: "Only the owner may view annual compensation summaries." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const staffUserId = Number(url.searchParams.get("staffUserId"));
  const taxYear = Number(url.searchParams.get("taxYear") ?? new Date().getFullYear());
  const format = url.searchParams.get("format");

  if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
    return NextResponse.json(
      { success: false, error: "staffUserId is required." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });
  let displayName = `Staff #${staffUserId}`;
  try {
    const user = await payload.findByID({
      collection: "users",
      id: staffUserId,
      depth: 0,
      overrideAccess: true,
    });
    displayName = String((user as { displayName?: string }).displayName ?? displayName);
  } catch {
    // keep fallback label
  }

  const summary = await loadStaffAnnualCompensationSummary({
    staffUserId,
    displayName,
    taxYear,
  });

  if (format === "csv") {
    const csv = staffAnnualCompensationSummaryToCsv(summary);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="staff-compensation-${staffUserId}-${taxYear}.csv"`,
      },
    });
  }

  return NextResponse.json({ success: true, summary });
}