/**
 * POST /api/junior-creators/auth/logout
 */
import { NextResponse } from "next/server";
import { destroyJuniorCreatorSession } from "@/lib/junior-creators/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroyJuniorCreatorSession();
  return NextResponse.json({ ok: true });
}
