/**
 * Pure Batch G Client HQ surface availability — no database.
 * Reuses CES launch nav visibility so direct routes match navigation.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { isPortalNavVisibleForCesLaunch } from "../ces-launch-safety";
import type { BatchGClientHqSurfaceId } from "./types";

/**
 * Whether an in-scope Client HQ surface may be opened for the active account.
 * Flagship CES profiles hide classic Requests/Assets/Deliverables/Reports in
 * nav; direct URLs must fail closed the same way.
 */
export function isBatchGClientHqSurfaceAvailable(
  navId: BatchGClientHqSurfaceId,
  profile?: ResolvedExperienceProfile | null,
): boolean {
  return isPortalNavVisibleForCesLaunch(navId, profile);
}
