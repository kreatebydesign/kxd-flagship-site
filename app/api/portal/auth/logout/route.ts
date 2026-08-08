/**
 * POST /api/portal/auth/logout
 */
import { NextResponse } from "next/server";
import { clearOperatorPortalPreviewCookie } from "@/lib/portal/operator-preview";
import { destroyPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroyPortalSession();
  // Never leave a dangling operator preview cookie after portal sign-out.
  try {
    await clearOperatorPortalPreviewCookie();
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true });
}
