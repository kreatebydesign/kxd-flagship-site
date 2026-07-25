import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getWorkItem, completeWorkItem } from "@/lib/work/services";
import { isRestrictedStaff } from "@/lib/staff/permissions";
import { publishActivity } from "@/lib/activity-engine/publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workId: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  // Sensitive categories still require approval — force review instead of complete.
  const needsMatt =
    work.priority === "critical" ||
    /invoice|billing|payment|agreement|entitlement/i.test(
      `${work.title} ${work.summary ?? ""}`,
    );

  if (needsMatt) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This item requires approval. Use Prepare for Review instead of Complete.",
      },
      { status: 403 },
    );
  }

  await completeWorkItem(workId, gated.actor.email);

  try {
    await publishActivity({
      eventType: "staff.work-completed",
      title: `Staff completed · ${work.title}`,
      summary: "Assigned work completed with intentional staff confirmation.",
      sourceModule: "Activity Engine",
      importance: "normal",
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
  return NextResponse.json({ success: true, status: "completed" });
}
