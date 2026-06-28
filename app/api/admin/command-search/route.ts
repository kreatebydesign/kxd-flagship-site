import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { universalCommandSearch } from "@/lib/search/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const result = await universalCommandSearch(q);
  return NextResponse.json(result);
}
