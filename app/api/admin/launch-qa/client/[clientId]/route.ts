import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createLaunchQaCheck, getLatestLaunchQaForClient } from "@/lib/launch-qa";

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await context.params;
  const cid = Number(clientId);
  if (!cid) {
    return NextResponse.json({ success: false, message: "Invalid client id." }, { status: 400 });
  }

  const detail = await getLatestLaunchQaForClient(cid);
  return NextResponse.json({ success: true, detail });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await context.params;
  const cid = Number(clientId);
  if (!cid) {
    return NextResponse.json({ success: false, message: "Invalid client id." }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      projectId?: number;
      websiteUrl?: string;
      launchDate?: string;
    };

    const existing = await getLatestLaunchQaForClient(cid);
    if (existing && !["launched", "archived"].includes(existing.status)) {
      return NextResponse.json({ success: true, detail: existing });
    }

    const detail = await createLaunchQaCheck({
      clientId: cid,
      projectId: body.projectId,
      websiteUrl: body.websiteUrl,
      launchDate: body.launchDate,
      createdFrom: "launch-qa-hub",
    });

    return NextResponse.json({ success: true, detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create Launch QA.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
