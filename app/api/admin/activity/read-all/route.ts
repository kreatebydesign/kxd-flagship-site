import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { markAllActivityRead } from "@/lib/activity-engine";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const readerKey =
    typeof auth === "object" && auth && "email" in auth && typeof auth.email === "string"
      ? auth.email
      : "studio";

  const result = await markAllActivityRead(readerKey);
  return NextResponse.json({ success: true, count: result.count });
}
