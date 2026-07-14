import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { checkSlugAvailability } from "@/lib/client-launch-wizard/server";

export async function GET(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const excludeDraftId = url.searchParams.get("draftId");
  if (!slug.trim()) {
    return NextResponse.json(
      { success: false, message: "slug is required." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });
  const result = await checkSlugAvailability(
    payload,
    slug,
    excludeDraftId ?? undefined,
  );
  return NextResponse.json({ success: true, ...result });
}
