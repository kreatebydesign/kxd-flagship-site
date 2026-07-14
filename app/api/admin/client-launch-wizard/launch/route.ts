import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { launchFromDraft } from "@/lib/client-launch-wizard/server";

export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as {
    draftId?: string | number;
    launchOperationId?: string;
  };

  if (body.draftId == null || body.draftId === "") {
    return NextResponse.json(
      { success: false, message: "draftId is required." },
      { status: 400 },
    );
  }

  const createdBy =
    (auth as { email?: string; name?: string }).email ||
    (auth as { name?: string }).name ||
    "KXD Admin";

  const payload = await getPayload({ config });
  const origin = new URL(request.url).origin;

  const result = await launchFromDraft({
    payload,
    draftId: body.draftId,
    createdBy,
    requestOrigin: origin,
    launchOperationId: body.launchOperationId,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        message: result.message,
        draft: result.draft ?? null,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    success: true,
    draft: result.draft,
    result: result.result,
  });
}
