/**
 * Pure Batch G Client HQ surface availability — no database.
 * Reuses CES launch nav visibility so direct routes match navigation.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { canPortalMemberAccessReports } from "@/lib/portal/member-reports-access";
import type { PortalSession } from "@/lib/portal/session";
import { isPortalNavVisibleForCesLaunch } from "../ces-launch-safety";
import type { BatchGClientHqSurfaceId } from "./types";

/**
 * Whether an in-scope Client HQ surface may be opened for the active account.
 * Direct URLs must match unified portal module visibility (not a flagship hide).
 */
export function isBatchGClientHqSurfaceAvailable(
  navId: BatchGClientHqSurfaceId,
  profile?: ResolvedExperienceProfile | null,
): boolean {
  return isPortalNavVisibleForCesLaunch(navId, profile);
}

/**
 * Reports surface — CES visibility plus per-member allowlists where configured.
 */
export function isPortalReportsSurfaceAvailable(
  profile: ResolvedExperienceProfile | null | undefined,
  session: Pick<PortalSession, "email" | "isOperatorPreview">,
): boolean {
  if (!isBatchGClientHqSurfaceAvailable("reports", profile)) return false;
  return canPortalMemberAccessReports({
    clientSlug: profile?.identity.clientSlug,
    portalUserEmail: session.email,
    isOperatorPreview: session.isOperatorPreview,
  });
}
