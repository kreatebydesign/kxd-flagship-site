import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { syncLinkedScheduleFromCalendar } from "@/lib/scheduling/sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scheduling/proposals/[id]/sync
 * Phase 27A — Manual linked-event synchronization (read + reconcile only).
 * Never creates Google Calendar events.
 */
export async function POST(
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
    const result = await syncLinkedScheduleFromCalendar(
      linkId,
      schedulingActorFromUser(auth),
    );
    return NextResponse.json({
      ok: true,
      result: {
        outcome: result.outcome,
        message: result.message,
        syncStatus: result.syncStatus,
        recoveryState: result.recoveryState,
        externalChangeClass: result.externalChangeClass,
        activityPublished: result.activityPublished,
        workProjectionUpdated: result.workProjectionUpdated,
        googleEventIdStable: result.googleEventIdStable,
        link: result.link,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not synchronize calendar.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
