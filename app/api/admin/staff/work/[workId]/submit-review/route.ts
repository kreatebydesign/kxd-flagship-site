import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getWorkItem, transitionWorkItem } from "@/lib/work/services";
import { isRestrictedStaff } from "@/lib/staff/permissions";
import { publishActivity } from "@/lib/activity-engine/publish";
import { workRequiresOperatorApproval } from "@/lib/staff/work-approval";
import {
  appendStaffSubmittedForReviewActivity,
  assertStaffGuidedChecklistReadyForSubmit,
} from "@/lib/staff/work-execution-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gated = await requireStaffCapabilityApi("staff.draft.submit-for-approval");
  if (gated instanceof NextResponse) return gated;

  const { workId: raw } = await context.params;
  const workId = Number(raw);
  if (!Number.isFinite(workId) || workId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid work id." },
      { status: 400 },
    );
  }

  const work = await getWorkItem(workId);
  if (!work) {
    return NextResponse.json(
      { success: false, error: "Work item not found." },
      { status: 404 },
    );
  }

  if (
    isRestrictedStaff(gated.actor) &&
    work.assignedToId !== gated.actor.userId
  ) {
    return NextResponse.json(
      { success: false, error: "Not assigned to this work item." },
      { status: 403 },
    );
  }

  const requiresMattApproval = workRequiresOperatorApproval(work, gated.actor);
  const checklistGate = await assertStaffGuidedChecklistReadyForSubmit(
    workId,
    gated.actor,
    requiresMattApproval,
  );
  if (!checklistGate.ok) {
    return NextResponse.json(
      { success: false, error: checklistGate.error },
      { status: 400 },
    );
  }

  await appendStaffSubmittedForReviewActivity(
    workId,
    gated.actor,
    requiresMattApproval,
  );

  await transitionWorkItem(workId, "review", gated.actor.email);

  try {
    await publishActivity({
      eventType: "staff.work-submitted-for-review",
      title: `Submitted for Matt · ${work.title}`,
      summary: "Staff prepared work and submitted for founder review.",
      sourceModule: "Activity Engine",
      importance: "high",
      clientId: work.clientId ?? undefined,
      occurredAt: new Date().toISOString(),
      metadata: {
        workId,
        staffUserId: gated.actor.userId,
        aiAssisted: false,
      },
    });
  } catch {
    /* best-effort */
  }

  void request;
  return NextResponse.json({ success: true, status: "review" });
}
