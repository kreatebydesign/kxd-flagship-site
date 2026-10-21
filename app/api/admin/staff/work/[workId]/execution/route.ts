import { NextResponse } from "next/server";
import {
  denyUnlessStaffAssignedWork,
  requireStaffCapabilityApi,
  requireStaffCapabilityReadApi,
} from "@/lib/staff/guard";
import { getWorkItem } from "@/lib/work/services";
import { workRequiresOperatorApproval } from "@/lib/staff/work-approval";
import {
  loadStaffGuidedChecklistChecked,
  saveStaffWorkExecution,
} from "@/lib/staff/work-execution-service";
import { splitWorkNotes } from "@/lib/staff/work-execution-notes";
import {
  loadWorkAcceptanceCriteriaViews,
  loadWorkDeliverableViews,
} from "@/lib/staff/work-deliverables-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const gated = await requireStaffCapabilityApi("staff.assigned-work.update");
  if (gated instanceof NextResponse) return gated;

  const { workId: raw } = await context.params;
  const workId = Number(raw);
  if (!Number.isFinite(workId) || workId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid work id." },
      { status: 400 },
    );
  }

  const denied = await denyUnlessStaffAssignedWork(gated.user, workId);
  if (denied) return denied;

  const work = await getWorkItem(workId);
  if (!work) {
    return NextResponse.json(
      { success: false, error: "Work item not found." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    staffProgress?: string | null;
    checklist?: Record<string, unknown> | null;
    deliverables?: Record<string, unknown> | null;
    acceptanceCriteria?: Record<string, unknown> | null;
  };

  if (
    body.staffProgress === undefined &&
    body.checklist === undefined &&
    body.deliverables === undefined &&
    body.acceptanceCriteria === undefined
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide staffProgress, checklist, deliverables, or acceptanceCriteria to save.",
      },
      { status: 400 },
    );
  }

  const requiresMattApproval = workRequiresOperatorApproval(work, gated.actor);

  try {
    const result = await saveStaffWorkExecution(
      workId,
      gated.actor,
      work,
      requiresMattApproval,
      {
        staffProgress: body.staffProgress,
        checklist: body.checklist,
        deliverables: body.deliverables,
        acceptanceCriteria: body.acceptanceCriteria,
      },
    );

    return NextResponse.json({
      success: true,
      studioNotes: result.studioNotes,
      staffProgress: result.staffProgress,
      checklist: result.checklist,
      deliverables: result.deliverables,
      acceptanceCriteria: result.acceptanceCriteria,
      progressSaved: result.progressSaved,
      checklistSaved: result.checklistSaved,
      deliverablesSaved: result.deliverablesSaved,
      acceptanceCriteriaSaved: result.acceptanceCriteriaSaved,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save execution state.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

/** Read persisted execution state (progress + checklist) for assigned staff. */
export async function GET(_request: Request, context: RouteContext) {
  const gated = await requireStaffCapabilityReadApi("staff.assigned-work.read");
  if (gated instanceof NextResponse) return gated;

  const { workId: raw } = await context.params;
  const workId = Number(raw);
  if (!Number.isFinite(workId) || workId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid work id." },
      { status: 400 },
    );
  }

  const denied = await denyUnlessStaffAssignedWork(gated.user, workId);
  if (denied) return denied;

  const work = await getWorkItem(workId);
  if (!work) {
    return NextResponse.json(
      { success: false, error: "Work item not found." },
      { status: 404 },
    );
  }

  const requiresMattApproval = workRequiresOperatorApproval(work, gated.actor);
  const { studioNotes, staffProgress } = splitWorkNotes(work.notes);
  const checklist = await loadStaffGuidedChecklistChecked(
    workId,
    gated.actor.userId,
    requiresMattApproval,
  );
  const deliverables = await loadWorkDeliverableViews(workId, gated.actor.userId);
  const acceptanceCriteria = await loadWorkAcceptanceCriteriaViews(
    workId,
    gated.actor.userId,
    work.acceptanceCriteria,
  );

  return NextResponse.json({
    success: true,
    studioNotes,
    staffProgress,
    checklist,
    deliverables,
    acceptanceCriteria,
  });
}
