import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getLeadActivities } from "@/lib/sales/activities";
import { getPayload } from "payload";
import config from "@payload-config";
import { assertStaffMayAccessSalesLead, type SalesLeadDoc } from "@/lib/staff/sales/access";
import { filterStaffVisibleSalesActivities } from "@/lib/staff/sales/projection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ leadId: string }> },
) {
  const gated = await requireStaffCapabilityApi("staff.sales.read");
  if (gated instanceof NextResponse) return gated;

  const { leadId: raw } = await ctx.params;
  const leadId = Number(raw);
  if (!leadId) {
    return NextResponse.json(
      { success: false, error: "Valid prospect id required." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });
  let lead: SalesLeadDoc;
  try {
    lead = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id: leadId,
      depth: 0,
      overrideAccess: true,
    })) as SalesLeadDoc;
  } catch {
    return NextResponse.json(
      { success: false, error: "Prospect not found." },
      { status: 404 },
    );
  }

  try {
    assertStaffMayAccessSalesLead(gated.actor, lead);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Permission denied.",
      },
      { status: 403 },
    );
  }

  const activities = filterStaffVisibleSalesActivities(
    (await getLeadActivities(leadId, 50)) as SalesLeadDoc[],
    gated.actor,
  );
  return NextResponse.json({
    success: true,
    activities,
  });
}
