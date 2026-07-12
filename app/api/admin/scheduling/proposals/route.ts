import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { createScheduleProposal } from "@/lib/scheduling/services";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scheduling/proposals
 * Create a schedule proposal for a Work item (Phase 25B — no Google writes).
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    workId?: number;
    proposedStart?: string;
    proposedEnd?: string;
    timezone?: string;
    durationMinutes?: number;
    schedulingReason?: string;
    intent?: "suggest" | "direct";
    externalAttendees?: boolean;
    displacesProtectedTime?: boolean;
    highImpactChange?: boolean;
    calendarOwnerId?: number | null;
  };

  if (!body.workId || !body.proposedStart || !body.proposedEnd) {
    return NextResponse.json(
      {
        ok: false,
        error: "workId, proposedStart, and proposedEnd are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createScheduleProposal({
      workId: Number(body.workId),
      proposedStart: body.proposedStart,
      proposedEnd: body.proposedEnd,
      timezone: body.timezone,
      durationMinutes: body.durationMinutes,
      schedulingReason: body.schedulingReason,
      intent: body.intent ?? "suggest",
      externalAttendees: body.externalAttendees,
      displacesProtectedTime: body.displacesProtectedTime,
      highImpactChange: body.highImpactChange,
      calendarOwnerId: body.calendarOwnerId,
      actor: schedulingActorFromUser(auth),
    });

    return NextResponse.json({
      ok: true,
      link: result.link,
      policy: result.policy,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create schedule proposal.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
