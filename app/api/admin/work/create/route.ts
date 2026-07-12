import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createWork, assignWorkNumber } from "@/lib/work/server";
import type { WorkCategory, WorkPriority, WorkSource, WorkStatus } from "@/lib/work/types";

export const dynamic = "force-dynamic";

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function parseTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value.map((t) => String(t).trim()).filter(Boolean);
  return tags.length ? tags : undefined;
}

/**
 * POST /api/admin/work/create
 * Executive Work Composer + programmatic create entry.
 * clientId is optional (internal studio work).
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const title = String(body.title ?? "").trim();

  if (!title) {
    return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 });
  }

  const clientId = optionalNumber(body.clientId) ?? null;

  try {
    const result = await createWork({
      clientId,
      title,
      summary: optionalString(body.summary),
      description: optionalString(body.description),
      notes: optionalString(body.notes),
      source: body.source ? (String(body.source) as WorkSource) : "manual",
      sourceId: optionalString(body.sourceId),
      category: body.category ? (String(body.category) as WorkCategory) : undefined,
      status: body.status ? (String(body.status) as WorkStatus) : "new",
      priority: body.priority ? (String(body.priority) as WorkPriority) : "normal",
      clientVisible: body.clientVisible === true,
      timelineEnabled: body.timelineEnabled !== false,
      createdBy: typeof auth.email === "string" ? auth.email : undefined,
      assignedToId: optionalNumber(body.assignedToId),
      internalProject: optionalString(body.project ?? body.internalProject),
      tags: parseTags(body.tags),
      estimatedEffort: optionalNumber(body.estimatedEffort),
      dueDate: optionalString(body.dueDate),
      startDate: optionalString(body.startDate),
      plannedForDate: optionalString(body.plannedForDate),
    });

    const workNumber = await assignWorkNumber(result.work.id);

    return NextResponse.json({ ok: true, work: result.work, workNumber });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create work.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
