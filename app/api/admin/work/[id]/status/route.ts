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

  const body = (await req.json()) as { status?: string };
  const status = body.status as WorkStatus | undefined;
  if (!status) {
    return NextResponse.json({ ok: false, error: "status is required." }, { status: 400 });
  }

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
    const work = await transitionWorkItem(
      workId,
      status,
      typeof auth.email === "string" ? auth.email : undefined,
    );
    return NextResponse.json({ ok: true, work, status: work.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update work status.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
