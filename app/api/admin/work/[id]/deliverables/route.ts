import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { staffActorFromUser } from "@/lib/staff/actor";
import { isRestrictedStaff } from "@/lib/staff/permissions";
import { denyUnlessStaffAssignedWork } from "@/lib/staff/guard";
import {
  loadWorkDeliverableViews,
  saveWorkAssignmentDeliverables,
} from "@/lib/staff/work-deliverables-service";
import { getWorkItem } from "@/lib/work/services";
import { splitWorkNotes, staffProgressPreview } from "@/lib/staff/work-execution-notes";
import { parseDeliverablesDefinition } from "@/lib/staff/work-deliverables";
import { readRawWorkMetadata } from "@/lib/staff/work-guided-metadata";
import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "@/lib/work/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
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

  const work = await getWorkItem(workId);
  if (!work) {
    return NextResponse.json({ ok: false, error: "Work not found." }, { status: 404 });
  }

  const assigneeId = work.assignedToId;
  const deliverables =
    assigneeId != null ? await loadWorkDeliverableViews(workId, assigneeId) : [];

  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });
  const metadata = readRawWorkMetadata(doc as Record<string, unknown>);
  const definition = parseDeliverablesDefinition(metadata);
  const { staffProgress } = splitWorkNotes(work.notes);

  return NextResponse.json({
    ok: true,
    workId,
    assigneeId,
    items: definition?.items ?? [],
    deliverables,
    staffProgressPreview: staffProgressPreview(staffProgress),
    status: work.status,
    blocked: work.status === "blocked",
    readyForReview:
      work.status === "review" ||
      (deliverables.length > 0 &&
        deliverables.every((d) => !d.required || d.completed) &&
        work.status !== "completed"),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const actor = staffActorFromUser(auth);
  if (actor && isRestrictedStaff(actor)) {
    return NextResponse.json(
      { ok: false, error: "Only operators may edit assignment deliverables." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const workId = Number.parseInt(id, 10);
  if (!Number.isFinite(workId)) {
    return NextResponse.json({ ok: false, error: "Invalid work id." }, { status: 400 });
  }

  const work = await getWorkItem(workId);
  if (!work) {
    return NextResponse.json({ ok: false, error: "Work not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { items?: unknown };
  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { ok: false, error: "Provide items array for deliverables." },
      { status: 400 },
    );
  }

  try {
    const result = await saveWorkAssignmentDeliverables(
      workId,
      body.items,
      typeof auth.email === "string" ? auth.email : null,
    );
    const assigneeId = work.assignedToId;
    const deliverables =
      assigneeId != null ? await loadWorkDeliverableViews(workId, assigneeId) : [];
    return NextResponse.json({
      ok: true,
      items: result.items,
      deliverables,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save deliverables.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
