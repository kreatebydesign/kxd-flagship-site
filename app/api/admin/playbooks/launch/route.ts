import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { launchPlaybookRun } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const playbookSlug = String(body.playbookSlug ?? "");
  const clientId = Number(body.clientId);
  const projectId = body.projectId ? Number(body.projectId) : undefined;

  if (!playbookSlug || !clientId) {
    return NextResponse.json({ success: false, error: "playbookSlug and clientId required" }, { status: 400 });
  }

  const userId = typeof auth.id === "number" ? auth.id : undefined;
  const result = await launchPlaybookRun({
    playbookSlug,
    clientId,
    projectId,
    startedByUserId: userId,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}
