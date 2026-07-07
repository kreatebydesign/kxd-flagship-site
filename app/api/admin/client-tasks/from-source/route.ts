import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { spawnWorkItem } from "@/lib/work-items/spawn";
import type { WorkItemSourceType } from "@/lib/work-items/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const clientId = Number(body.clientId);
  const title = String(body.title ?? "").trim();
  const createdFrom = String(body.createdFrom ?? body.sourceType ?? "");

  if (!clientId || !title || !createdFrom) {
    return NextResponse.json(
      { success: false, error: "clientId, title, and createdFrom (or sourceType) required" },
      { status: 400 },
    );
  }

  const result = await spawnWorkItem({
    clientId,
    title,
    description: body.description ? String(body.description) : undefined,
    category: body.category ? String(body.category) : undefined,
    sourceType: (body.sourceType ?? createdFrom) as WorkItemSourceType,
    relatedRequestId: body.relatedRequestId ? Number(body.relatedRequestId) : undefined,
    relatedDeliverableId: body.relatedDeliverableId ? Number(body.relatedDeliverableId) : undefined,
    relatedPlaybookId: body.relatedPlaybookId ? Number(body.relatedPlaybookId) : undefined,
    relatedRetainerId: body.relatedRetainerId ? Number(body.relatedRetainerId) : undefined,
    relatedUpgradeOfferId: body.relatedUpgradeOfferId ? Number(body.relatedUpgradeOfferId) : undefined,
    projectId: body.projectId ? Number(body.projectId) : undefined,
  });

  return NextResponse.json(result);
}
