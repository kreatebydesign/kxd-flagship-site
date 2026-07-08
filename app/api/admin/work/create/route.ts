import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createWork, assignWorkNumber } from "@/lib/work/server";
import type { WorkCategory, WorkPriority, WorkSource, WorkStatus } from "@/lib/work/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const clientId = Number(body.clientId);
  const title = String(body.title ?? "").trim();

  if (!clientId || !title) {
    return NextResponse.json({ ok: false, error: "clientId and title are required." }, { status: 400 });
  }

  try {
    const result = await createWork({
      clientId,
      title,
      summary: body.summary ? String(body.summary) : undefined,
      source: body.source ? (String(body.source) as WorkSource) : "manual",
      sourceId: body.sourceId ? String(body.sourceId) : undefined,
      category: body.category ? (String(body.category) as WorkCategory) : undefined,
      status: body.status ? (String(body.status) as WorkStatus) : undefined,
      priority: body.priority ? (String(body.priority) as WorkPriority) : undefined,
      clientVisible: body.clientVisible === true,
      timelineEnabled: body.timelineEnabled !== false,
      createdBy: typeof auth.email === "string" ? auth.email : undefined,
      assignedToId: body.assignedToId ? Number(body.assignedToId) : undefined,
      dueDate: body.dueDate ? String(body.dueDate) : undefined,
    });

    const workNumber = await assignWorkNumber(result.work.id);

    return NextResponse.json({ ok: true, work: result.work, workNumber });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create work.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
