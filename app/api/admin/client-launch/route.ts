import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { launchClientWorkflow } from "@/lib/client-launch/launch-client-workflow";
import type { ClientLaunchDraft } from "@/lib/client-launch/types";

export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { draft?: ClientLaunchDraft };
    if (!body.draft) {
      return NextResponse.json({ success: false, message: "Missing launch draft." }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const createdBy =
      (auth as { email?: string; name?: string }).email ||
      (auth as { name?: string }).name ||
      "KXD Admin";

    const result = await launchClientWorkflow(payload, body.draft, createdBy);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Launch failed.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
