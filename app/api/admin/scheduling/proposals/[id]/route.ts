import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { updateScheduleProposal } from "@/lib/scheduling/services";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/scheduling/proposals/[id]
 */
export async function PATCH(
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

  const body = (await req.json().catch(() => ({}))) as {
    proposedStart?: string;
    proposedEnd?: string;
    timezone?: string;
    durationMinutes?: number;
    schedulingReason?: string;
  };

  try {
    const link = await updateScheduleProposal({
      linkId,
      ...body,
      actor: schedulingActorFromUser(auth),
    });
    return NextResponse.json({ ok: true, link });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update proposal.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
