import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { denyUnlessStaffAssignedWork } from "@/lib/staff/guard";
import { staffActorFromUser } from "@/lib/staff/actor";
import { assertRestrictedStaffWorkStatusTransition } from "@/lib/staff/work-status-policy";
import { getWorkItem, transitionWorkItem } from "@/lib/work/services";
import type { WorkStatus } from "@/lib/work/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const workId = Number.parseInt(id, 10);
  if (!Number.isFinite(workId)) {
    return NextResponse.json({ ok: false, error: "Invalid work id." }, { status: 400 });
  }

  const denied = await denyUnlessStaffAssignedWork(auth, workId);
  if (denied) return denied;

  const body = (await req.json()) as { status?: string; note?: string };
  const status = body.status as WorkStatus | undefined;
  if (!status) {
    return NextResponse.json({ ok: false, error: "status is required." }, { status: 400 });
  }
  const note = body.note?.trim();

  const actor = staffActorFromUser(auth);
  const workBefore = await getWorkItem(workId);
  if (!workBefore) {
    return NextResponse.json({ ok: false, error: "Work not found." }, { status: 404 });
  }
  if (actor) {
    try {
      assertRestrictedStaffWorkStatusTransition(actor, workBefore, status);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Staff permission denied.";
      return NextResponse.json({ ok: false, error: message }, { status: 403 });
    }
  }

  try {
    const actorEmail = typeof auth.email === "string" ? auth.email : undefined;
    if (note && status === "blocked") {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const blockNote = `[Blocked ${stamp}]\n${note}`;
      const merged = workBefore.notes
        ? `${workBefore.notes}\n\n${blockNote}`
        : blockNote;
      const { updateWorkItem } = await import("@/lib/work/services");
      await updateWorkItem({
        workId,
        status,
        notes: merged,
        actorEmail,
      });
      const work = await getWorkItem(workId);
      if (!work) {
        return NextResponse.json({ ok: false, error: "Work not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, work, status: work.status });
    }
    const work = await transitionWorkItem(workId, status, actorEmail);
    return NextResponse.json({ ok: true, work, status: work.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update work status.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
