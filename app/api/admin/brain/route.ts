import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { buildBrain, clearBrainCache } from "@/lib/brain";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const snapshot = await buildBrain();
  return NextResponse.json({ success: true, snapshot });
}

export async function POST() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  clearBrainCache();
  const snapshot = await buildBrain();
  return NextResponse.json({ success: true, snapshot });
}
