import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { getSchedulingProposalDetail } from "@/lib/scheduling/proposals-list";
import { updateScheduleProposal } from "@/lib/scheduling/services";
import {
  buildWorkspaceCapabilities,
  resolveSchedulingCapabilities,
} from "@/lib/scheduling";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/scheduling/proposals/[id]
 * Proposal detail for the Scheduling Workspace (Phase 26B).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const linkId = Number.parseInt(id, 10);
  if (!Number.isFinite(linkId)) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  try {
    const detail = await getSchedulingProposalDetail(linkId);
    if (!detail) {
      return NextResponse.json(
        { ok: false, error: "Proposal not found." },
        { status: 404 },
      );
    }
    const actor = schedulingActorFromUser(auth);
    return NextResponse.json({
      ok: true,
      proposal: detail,
      actor: {
        userId: actor.userId,
        email: actor.email,
        displayName: actor.displayName,
        role: actor.role,
      },
      capabilities: buildWorkspaceCapabilities(
        resolveSchedulingCapabilities(actor),
      ),
      writeEnabled: false,
      phase: "26B",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load proposal.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/scheduling/proposals/[id]
 * Adjust proposal to another candidate window (no Google writes).
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
    return NextResponse.json({
      ok: true,
      link,
      writeEnabled: false,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update proposal.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
