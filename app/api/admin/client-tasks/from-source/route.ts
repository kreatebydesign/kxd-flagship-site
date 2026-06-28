import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createTaskFromSource } from "@/lib/client-tasks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const clientId = Number(body.clientId);
  const title = String(body.title ?? "").trim();
  const createdFrom = String(body.createdFrom ?? "");

  if (!clientId || !title || !createdFrom) {
    return NextResponse.json(
      { success: false, error: "clientId, title, and createdFrom required" },
      { status: 400 },
    );
  }

  const result = await createTaskFromSource({
    clientId,
    title,
    description: body.description ? String(body.description) : undefined,
    category: body.category ? String(body.category) : undefined,
    createdFrom,
    relatedRequestId: body.relatedRequestId ? Number(body.relatedRequestId) : undefined,
    relatedDeliverableId: body.relatedDeliverableId ? Number(body.relatedDeliverableId) : undefined,
    relatedPlaybookId: body.relatedPlaybookId ? Number(body.relatedPlaybookId) : undefined,
    projectId: body.projectId ? Number(body.projectId) : undefined,
  });

  return NextResponse.json(result);
}
