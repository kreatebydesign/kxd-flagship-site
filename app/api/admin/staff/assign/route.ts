import { NextResponse } from "next/server";
import { requireAdminOversightApi } from "@/lib/staff/guard";
import { createWorkItem, updateWorkItem, getWorkItem } from "@/lib/work/services";
import type { WorkPriority } from "@/lib/work/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Matt assigns or updates work for staff.
 * Does not invent work beyond the payload Matt provides.
 */
export async function POST(request: Request) {
  const gated = await requireAdminOversightApi();
  if (gated instanceof NextResponse) return gated;

  const body = (await request.json()) as {
    workId?: number;
    staffUserId?: number;
    title?: string;
    summary?: string;
    expectedOutcome?: string;
    priority?: WorkPriority;
    dueDate?: string | null;
    plannedForDate?: string | null;
    requiresApproval?: boolean;
    estimatedEffort?: number | null;
  };

  const staffUserId = Number(body.staffUserId);
  if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
    return NextResponse.json(
      { success: false, error: "staffUserId is required." },
      { status: 400 },
    );
  }

  const tags: string[] = [];
  if (body.requiresApproval) tags.push("requires-approval");

  if (body.workId) {
    const existing = await getWorkItem(body.workId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Work item not found." },
        { status: 404 },
      );
    }
    const nextTags = Array.from(
      new Set([
        ...existing.tags.filter((t) => t !== "requires-approval"),
        ...tags,
      ]),
    );
    const notes =
      body.expectedOutcome?.trim()
        ? `${existing.notes ? `${existing.notes}\n\n` : ""}[Expected outcome]\n${body.expectedOutcome.trim()}`
        : existing.notes;

    const work = await updateWorkItem({
      workId: body.workId,
      assignedToId: staffUserId,
      title: body.title?.trim() || undefined,
      summary: body.summary?.trim() ?? undefined,
      notes,
      priority: body.priority,
      dueDate: body.dueDate,
      plannedForDate: body.plannedForDate,
      estimatedEffort: body.estimatedEffort ?? undefined,
      tags: nextTags,
      actorEmail: gated.actor.email,
    });

    return NextResponse.json({ success: true, workId: work.id, created: false });
  }

  if (!body.title?.trim()) {
    return NextResponse.json(
      { success: false, error: "title is required when creating work." },
      { status: 400 },
    );
  }

  const work = await createWorkItem({
    title: body.title.trim(),
    summary: body.summary?.trim() || body.expectedOutcome?.trim(),
    notes: body.expectedOutcome?.trim()
      ? `[Expected outcome]\n${body.expectedOutcome.trim()}`
      : undefined,
    assignedToId: staffUserId,
    priority: body.priority ?? "normal",
    dueDate: body.dueDate ?? undefined,
    plannedForDate: body.plannedForDate ?? undefined,
    estimatedEffort: body.estimatedEffort ?? undefined,
    category: "operations",
    source: "manual",
    status: "planned",
    tags,
    createdBy: gated.actor.email,
  });

  return NextResponse.json({ success: true, workId: work.id, created: true });
}
