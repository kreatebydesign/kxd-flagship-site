/**
 * POST /api/portal/auth/logout
 */
import { NextResponse } from "next/server";
import { destroyPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroyPortalSession();
  return NextResponse.json({ ok: true });
}
