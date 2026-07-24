import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { PAYLOAD_AUTH_COOKIE_PREFIX } from "@/lib/admin/constants";
import { clearStaffPreviewCookie } from "@/lib/staff/preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Destroy Payload admin session for Studio / staff.
 * Clears httpOnly auth cookies — does not merely redirect.
 */
export async function POST() {
  const jar = await cookies();
  const headersList = await headers();

  try {
    const payload = await getPayload({ config });
    // Prefer Local API logout when available (Payload 3).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logout = (payload as any).logout as
      | ((args: { collection: string; headers?: Headers }) => Promise<unknown>)
      | undefined;
    if (typeof logout === "function") {
      await logout.call(payload, {
        collection: "users",
        headers: headersList,
      });
    }
  } catch {
    /* continue — still clear cookies below */
  }

  const tokenName = `${PAYLOAD_AUTH_COOKIE_PREFIX}-token`;
  const expire = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };

  jar.set(tokenName, "", expire);
  // Clear any payload-* token-shaped cookies from older naming.
  for (const cookie of jar.getAll()) {
    if (
      cookie.name === tokenName ||
      (cookie.name.startsWith(`${PAYLOAD_AUTH_COOKIE_PREFIX}-`) &&
        cookie.name.endsWith("-token"))
    ) {
      jar.set(cookie.name, "", expire);
    }
  }

  try {
    await clearStaffPreviewCookie();
  } catch {
    /* best-effort */
  }

  return NextResponse.json(
    { success: true, redirectTo: "/admin/login" },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
      },
    },
  );
}
