import { NextResponse } from "next/server";
import { requireAdminOversightApi } from "@/lib/staff/guard";
import { getWorkItem, transitionWorkItem, updateWorkItem } from "@/lib/work/services";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workId: string }> };

/** Matt returns prepared work for staff correction. */
export async function POST(request: Request, context: RouteContext) {
  const gated = await requireAdminOversightApi();
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

  const body = (await request.json().catch(() => ({}))) as { note?: string };
  const note = body.note?.trim();
  const tags = Array.from(
    new Set([...work.tags.filter((t) => t !== "requires-approval"), "returned-by-matt"]),
  );
  const notes = note
    ? `${work.notes ? `${work.notes}\n\n` : ""}[Returned by Matt]\n${note}`
    : `${work.notes ? `${work.notes}\n\n` : ""}[Returned by Matt]`;

  await updateWorkItem({
    workId,
    status: "in-progress",
    tags,
    notes,
    actorEmail: gated.actor.email,
  });

  void request;
  return NextResponse.json({ success: true, status: "in-progress" });
}

/** Matt approves prepared work (marks complete). */
export async function PUT(request: Request, context: RouteContext) {
  const gated = await requireAdminOversightApi();
  if (gated instanceof NextResponse) return gated;

  const { workId: raw } = await context.params;
  const workId = Number(raw);
  if (!Number.isFinite(workId) || workId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid work id." },
      { status: 400 },
    );
  }

  await transitionWorkItem(workId, "completed", gated.actor.email);
  void request;
  return NextResponse.json({ success: true, status: "completed" });
}
