import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { listSchedulingProposals } from "@/lib/scheduling/proposals-list";
import { createScheduleProposal } from "@/lib/scheduling/services";
import {
  buildWorkspaceCapabilities,
  resolveSchedulingCapabilities,
} from "@/lib/scheduling";
import type { ScheduleLinkStatus } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/scheduling/proposals
 * List proposals for the Scheduling Proposal Workspace (Phase 26B).
 * No Google event titles or credentials.
 */
export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 100;
  const statusParam = url.searchParams.get("status");
  const statuses = statusParam
    ? (statusParam.split(",").filter(Boolean) as ScheduleLinkStatus[])
    : undefined;

  try {
    const { proposals, totalDocs } = await listSchedulingProposals({
      limit,
      statuses,
    });
    const actor = schedulingActorFromUser(auth);
    const capabilities = buildWorkspaceCapabilities(
      resolveSchedulingCapabilities(actor),
    );

    return NextResponse.json({
      ok: true,
      proposals,
      totalDocs,
      actor: {
        userId: actor.userId,
        email: actor.email,
        displayName: actor.displayName,
        role: actor.role,
      },
      capabilities,
      writeEnabled: false,
      phase: "26B",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not list proposals.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

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
      writeEnabled: false,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create schedule proposal.";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : undefined;
    const status =
      code === "ACTIVE_PROPOSAL_EXISTS" || code === "CONCURRENT_PROPOSAL_MUTATION"
        ? 409
        : 400;
    return NextResponse.json(
      {
        ok: false,
        error: message,
        code,
        hint:
          code === "ACTIVE_PROPOSAL_EXISTS" ||
          code === "CONCURRENT_PROPOSAL_MUTATION"
            ? "Review or adjust the existing proposal in Scheduling."
            : undefined,
      },
      { status },
    );
  }
}
