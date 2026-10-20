import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getStaffPreviewSession } from "@/lib/staff/preview";
import type { OutreachKind } from "@/lib/sales/follow-up-policy";
import { logStaffProspectOutreach } from "@/lib/staff/sales/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OUTREACH_KINDS = new Set<string>([
  "email",
  "call",
  "meeting",
  "note",
  "follow-up",
]);

export async function POST(
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
  const kind = String(body.kind ?? "");
  if (!OUTREACH_KINDS.has(kind)) {
    return NextResponse.json(
      { success: false, error: "kind must be email, call, meeting, note, or follow-up." },
      { status: 400 },
    );
  }

  const result = await logStaffProspectOutreach(gated.actor, leadId, {
    kind: kind as OutreachKind,
    summary: body.summary != null ? String(body.summary) : undefined,
    nextAction: body.nextAction != null ? String(body.nextAction) : undefined,
    nextFollowUp: body.nextFollowUp != null ? String(body.nextFollowUp) : undefined,
    nextActionNote:
      body.nextActionNote != null ? String(body.nextActionNote) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true });
}
