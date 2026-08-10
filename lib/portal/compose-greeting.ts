import "server-only";

import { resolveRequestTimezone } from "@/lib/platform/timezone";
import {
  portalTimeGreeting,
  resolvePortalGreetingName,
} from "@/lib/portal/greeting";
import type { PortalSession } from "@/lib/portal/session";

export async function composePortalGreeting(session: PortalSession): Promise<string> {
  const timeZone = await resolveRequestTimezone();
  return portalTimeGreeting(resolvePortalGreetingName(session), { timeZone });
}
