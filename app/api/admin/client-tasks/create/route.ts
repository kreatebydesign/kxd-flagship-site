import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createTask } from "@/lib/client-tasks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const clientId = Number(body.clientId);
  const title = String(body.title ?? "").trim();

  if (!clientId || !title) {
    return NextResponse.json({ success: false, error: "clientId and title required" }, { status: 400 });
  }

  const result = await createTask({
    clientId,
    title,
    description: body.description ? String(body.description) : undefined,
    category: body.category ? String(body.category) : undefined,
    priority: body.priority ? String(body.priority) : undefined,
    status: body.status as import("@/lib/client-tasks/types").TaskStatus | undefined,
    projectId: body.projectId ? Number(body.projectId) : undefined,
    dueDate: body.dueDate ? String(body.dueDate) : undefined,
    estimatedHours: body.estimatedHours != null ? Number(body.estimatedHours) : undefined,
    assignedTo: body.assignedTo ? Number(body.assignedTo) : undefined,
    createdFrom: body.createdFrom ? String(body.createdFrom) : "manual",
  });

  return NextResponse.json(result);
}
