import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PortalSession } from "./session";

export function needsPortalWelcome(session: PortalSession): boolean {
  return !session.welcomeCompletedAt;
}

export async function completePortalWelcome(portalUserId: number): Promise<string> {
  const payload = await getPayload({ config });
  const completedAt = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await payload.update({
    collection: "portal-users" as any,
    id: portalUserId,
    data: {
      welcomeCompletedAt: completedAt,
    } as any,
    overrideAccess: true,
  });

  return completedAt;
}
