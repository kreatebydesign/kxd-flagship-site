import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getStaffPreviewSession } from "@/lib/staff/preview";
import {
  createStaffProspect,
  loadStaffSalesList,
} from "@/lib/staff/sales/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gated = await requireStaffCapabilityApi("staff.sales.read");
  if (gated instanceof NextResponse) return gated;

  const data = await loadStaffSalesList(gated.actor);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.sales.manage");
  if (gated instanceof NextResponse) return gated;

  const preview = await getStaffPreviewSession();
  if (preview) {
    return NextResponse.json(
      { success: false, error: "Preview mode is read-only." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await createStaffProspect(gated.actor, {
    companyName: String(body.companyName ?? ""),
    contactName: String(body.contactName ?? ""),
    email: body.email != null ? String(body.email) : undefined,
    phone: body.phone != null ? String(body.phone) : undefined,
    website: body.website != null ? String(body.website) : undefined,
    opportunityUrl:
      body.opportunityUrl != null ? String(body.opportunityUrl) : undefined,
    industry: body.industry != null ? String(body.industry) : undefined,
    notes: body.notes != null ? String(body.notes) : undefined,
    allowDuplicateCompany: body.allowDuplicateCompany === true,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    success: true,
    id: result.id,
    reusedExisting: result.reusedExisting,
    href: `/admin/operations/staff/sales/${result.id}`,
  });
}
