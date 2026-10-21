import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { PayloadRequest } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";

import { isPayloadAdmin } from "../../payload/access/index.ts";
import {
  OPERATIONS_HOME_PATH,
  PAYLOAD_ADMIN_LOGIN_PATH,
} from "./constants";

/**
 * Resolve the authenticated Payload **admin** (`users`) session.
 *
 * Portal users share Payload's auth cookie namespace when `payload.login` is used
 * for `portal-users`. Only `users` collection sessions are accepted here —
 * portal sessions never grant operator APIs.
 */
function normalizePayloadAdminUser(user: PayloadRequest["user"]) {
  if (!user) return null;
  if (!isPayloadAdmin(user)) return null;
  if (user.collection && user.collection !== "users") return null;
  return user;
}

/**
 * Payload session resolution needs a `Cookie` header. On some App Router POST
 * handlers `request.headers` omits cookies; merge `cookies()` + `headers()`.
 */
async function payloadAuthHeaders(inbound?: HeadersInit): Promise<Headers> {
  const merged = new Headers(inbound);
  const headersList = await headers();
  headersList.forEach((value, key) => {
    if (key.toLowerCase() === "cookie") return;
    if (!merged.has(key)) merged.set(key, value);
  });

  const cookieStore = await cookies();
  const fromStore = cookieStore
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  const fromHeaders = headersList.get("cookie");
  const forwarded = headersList.get("x-kxd-forwarded-cookie");
  const cookieParts = [merged.get("cookie"), fromHeaders, forwarded, fromStore].filter(
    Boolean,
  );
  if (cookieParts.length > 0) {
    merged.set("cookie", cookieParts.join("; "));
  }
  return merged;
}

async function resolvePayloadAdminUserFromHeaders(
  inbound?: HeadersInit,
): Promise<ReturnType<typeof normalizePayloadAdminUser>> {
  const headersList = await payloadAuthHeaders(inbound);
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: headersList });
  return normalizePayloadAdminUser(user);
}

export const getPayloadAdminUser = cache(async function getPayloadAdminUser() {
  return resolvePayloadAdminUserFromHeaders(await headers());
});

/** Route handlers: inbound Request + explicit cookie merge for POST mutations. */
export async function getPayloadAdminUserFromRequest(request: Request) {
  const fromRequest = await resolvePayloadAdminUserFromHeaders(request.headers);
  if (fromRequest) return fromRequest;
  return getPayloadAdminUser();
}

/**
 * Gate internal admin API routes — requires authenticated Payload `users` session.
 * Returns the admin user, or a 401 JSON response.
 * Restricted staff roles are deny-by-default against non-allowlisted API paths.
 */
export async function requirePayloadAdminApi(request?: Request) {
  const user = request
    ? await getPayloadAdminUserFromRequest(request)
    : await getPayloadAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const { staffActorFromUser } = await import("@/lib/staff/actor");
    const {
      isRestrictedStaff,
      isStaffAllowedApiPath,
    } = await import("@/lib/staff/permissions");
    const { getStaffPreviewSession } = await import("@/lib/staff/preview");
    const actor = staffActorFromUser(user);
    if (actor && isRestrictedStaff(actor)) {
      const preview = await getStaffPreviewSession();
      if (preview) {
        return NextResponse.json(
          {
            success: false,
            ok: false,
            error: "Preview mode is read-only. Changes are disabled.",
          },
          { status: 403 },
        );
      }
      const { headers: nextHeaders } = await import("next/headers");
      const h = await nextHeaders();
      const pathname =
        (request ? new URL(request.url).pathname : "") ||
        h.get("x-kxd-pathname") ||
        h.get("next-url") ||
        h.get("x-invoke-path") ||
        "";
      // Fail closed when pathname cannot be resolved for restricted staff.
      if (!pathname || !isStaffAllowedApiPath(pathname, actor)) {
        return NextResponse.json(
          {
            success: false,
            ok: false,
            error: "Staff permission denied for this API.",
          },
          { status: 403 },
        );
      }
    }
  } catch (err) {
    console.error("[KXD Admin Auth] Staff permission evaluation failed:", err);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "Staff permission evaluation failed.",
      },
      { status: 403 },
    );
  }

  return user;
}

/**
 * Gate KXD OS operations pages — requires an authenticated Payload `users` session.
 * Redirects to Payload admin login with a post-auth return path.
 */
export async function requirePayloadAdminPage(
  returnPath: string = OPERATIONS_HOME_PATH,
) {
  const user = await getPayloadAdminUser();
  if (!user) {
    const params = new URLSearchParams({ redirect: returnPath });
    redirect(`${PAYLOAD_ADMIN_LOGIN_PATH}?${params.toString()}`);
  }
  return user;
}
