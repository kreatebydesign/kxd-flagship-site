import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { markActivityRead } from "@/lib/activity-engine";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const readerKey =
    typeof auth === "object" && auth && "email" in auth && typeof auth.email === "string"
      ? auth.email
      : "studio";

  const result = await markActivityRead(decodeURIComponent(id), readerKey);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "Activity not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, already: result.already ?? false });
}
