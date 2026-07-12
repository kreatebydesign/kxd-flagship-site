import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getWorkItem, updateWorkItem } from "@/lib/work/services";
import type { WorkCategory, WorkPriority, WorkStatus } from "@/lib/work/types";

export const dynamic = "force-dynamic";

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  return s || null;
}

function parseTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.map((t) => String(t).trim()).filter(Boolean);
}

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

  const work = await getWorkItem(workId);
  if (!work) {
    return NextResponse.json({ ok: false, error: "Work not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, work });
}

export async function PATCH(
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

  const body = await req.json();
  const title = optionalString(body.title);

  try {
    const work = await updateWorkItem({
      workId,
      title: title === null ? undefined : title ?? undefined,
      description: optionalString(body.description),
      summary: optionalString(body.summary),
      notes: optionalString(body.notes),
      status: body.status ? (String(body.status) as WorkStatus) : undefined,
      priority: body.priority ? (String(body.priority) as WorkPriority) : undefined,
      category: body.category ? (String(body.category) as WorkCategory) : undefined,
      clientId: optionalNumber(body.clientId),
      assignedToId:
        body.assignedToId === undefined
          ? undefined
          : (optionalNumber(body.assignedToId) ?? null),
      internalProject: optionalString(body.project ?? body.internalProject),
      tags: parseTags(body.tags),
      estimatedEffort: optionalNumber(body.estimatedEffort),
      dueDate: optionalString(body.dueDate),
      startDate: optionalString(body.startDate),
      plannedForDate: optionalString(body.plannedForDate),
      actorEmail: typeof auth.email === "string" ? auth.email : undefined,
    });

    return NextResponse.json({ ok: true, work });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update work.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
