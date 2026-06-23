import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
 * Gate KXD OS operations pages — requires an authenticated Payload `users` session.
 * Redirects to Payload admin login with a post-auth return path.
 */
export async function requirePayloadAdminPage(
  returnPath = OPERATIONS_HOME_PATH.replace(/^\/admin/, "") || "/operations/executive",
) {
  const user = await getPayloadAdminUser();
  if (!user) {
    const params = new URLSearchParams({ redirect: returnPath });
    redirect(`${PAYLOAD_ADMIN_LOGIN_PATH}?${params.toString()}`);
  }
  return user;
}
