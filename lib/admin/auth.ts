import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { executeAuthStrategies, getPayload } from "payload";
import config from "@payload-config";

import { isPayloadAdmin } from "../../payload/access/index.ts";
import {
  OPERATIONS_HOME_PATH,
  PAYLOAD_ADMIN_LOGIN_PATH,
} from "./constants";

export async function getPayloadAdminUser() {
  const headersList = await headers();
  const payload = await getPayload({ config });
  const { user } = await executeAuthStrategies({
    headers: headersList,
    payload,
  });

  return isPayloadAdmin(user) ? user : null;
}

/**
 * Gate internal admin API routes — requires authenticated Payload `users` session.
 * Returns the admin user, or a 401 JSON response.
 */
export async function requirePayloadAdminApi() {
  const user = await getPayloadAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
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
