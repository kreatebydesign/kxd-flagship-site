import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
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
export async function getPayloadAdminUser() {
  const headersList = await headers();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: headersList });

  if (!user) return null;
  if (!isPayloadAdmin(user)) return null;
  if (user.collection && user.collection !== "users") return null;
  return user;
}

/**
 * Gate internal admin API routes — requires authenticated Payload `users` session.
 * Returns the admin user, or a 401 JSON response.
 * Restricted staff roles are deny-by-default against non-allowlisted API paths.
 */
export async function requirePayloadAdminApi() {
  const user = await getPayloadAdminUser();
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
        h.get("x-kxd-pathname") ||
        h.get("next-url") ||
        h.get("x-invoke-path") ||
        "";
      if (pathname && !isStaffAllowedApiPath(pathname, actor)) {
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
  } catch {
    /* fail open only if staff modules fail to load — auth still required */
  }

  return user;
}

/**
 * Gate KXD OS operations pages — requires an authenticated Payload `users` session.
 * Redirects to Payload admin login with a post-auth return path.
 */
export async function requirePayloadAdminPage(
  returnPath = OPERATIONS_HOME_PATH,
) {
  const user = await getPayloadAdminUser();
  if (!user) {
    const params = new URLSearchParams({ redirect: returnPath });
    redirect(`${PAYLOAD_ADMIN_LOGIN_PATH}?${params.toString()}`);
  }
  return user;
}
