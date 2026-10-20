import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getStaffPreviewSession } from "@/lib/staff/preview";
import {
  loadStaffSalesDetail,
  patchStaffProspect,
} from "@/lib/staff/sales/data";

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

  const data = await loadStaffSalesDetail(gated.actor, leadId);
  if (!data) {
    return NextResponse.json(
      { success: false, error: "Prospect not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ leadId: string }> },
) {
  const gated = await requireStaffCapabilityApi("staff.sales.manage");
  if (gated instanceof NextResponse) return gated;

  const preview = await getStaffPreviewSession();
  if (preview) {
    return NextResponse.json(
      { success: false, error: "Preview mode is read-only." },
      { status: 403 },
    );
  }

  const { leadId: raw } = await ctx.params;
  const leadId = Number(raw);
  if (!leadId) {
    return NextResponse.json(
      { success: false, error: "Valid prospect id required." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await patchStaffProspect(gated.actor, leadId, body);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true });
}
