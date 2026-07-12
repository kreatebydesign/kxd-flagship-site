import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { rejectScheduleProposal } from "@/lib/scheduling/services";

export const dynamic = "force-dynamic";

/** POST /api/admin/scheduling/proposals/[id]/reject */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const linkId = Number.parseInt(id, 10);
  if (!Number.isFinite(linkId)) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  try {
    const link = await rejectScheduleProposal(
      linkId,
      schedulingActorFromUser(auth),
      body.reason?.trim() || "Rejected",
    );
    return NextResponse.json({ ok: true, link });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reject proposal.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
