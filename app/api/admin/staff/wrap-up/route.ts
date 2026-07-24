import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getAssignedWorkForStaff } from "@/lib/staff/load";
import { buildStaffWrapUp, saveStaffWrapUpNote } from "@/lib/staff/wrap-up";
import { toLocalDateKey } from "@/lib/staff/prioritize";
import { getStaffPreviewSession } from "@/lib/staff/preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Save optional end-of-day note for Matt. Does not mutate work dates/status. */
export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.notes.internal");
  if (gated instanceof NextResponse) return gated;

  const preview = await getStaffPreviewSession();
  if (preview) {
    return NextResponse.json(
      { success: false, error: "Preview mode is read-only." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { noteForMatt?: string };
  const note = body.noteForMatt?.trim() ?? "";
  if (!note) {
    return NextResponse.json(
      { success: false, error: "noteForMatt is required." },
      { status: 400 },
    );
  }

  const dateKey = toLocalDateKey();
  const assigned = await getAssignedWorkForStaff(gated.actor.userId);
  const wrapUp = buildStaffWrapUp({ assigned });
  const saved = await saveStaffWrapUpNote({
    staffUserId: gated.actor.userId,
    dateKey,
    noteForMatt: note,
    snapshot: {
      completedToday: wrapUp.completedToday.length,
      preparedForMatt: wrapUp.preparedForMatt.length,
      underway: wrapUp.underway.length,
      blockers: wrapUp.blockers.length,
    },
  });

  return NextResponse.json({ success: true, id: saved.id, dateKey });
}
