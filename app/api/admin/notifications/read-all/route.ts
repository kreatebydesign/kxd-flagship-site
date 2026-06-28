import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { markAllNotificationsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const result = await markAllNotificationsRead();
  return NextResponse.json(result);
}
