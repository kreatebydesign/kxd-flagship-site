import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { markNotificationRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await markNotificationRead(id);
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
