/**
 * Primal Motorsports — post-launch operating content (CONTENT pack).
 *
 * STRUCTURAL post-launch behavior now lives in shared Client Operating State.
 * This module re-exports the Primal content pack for scripts and regression.
 */

export {
  PRIMAL_POST_LAUNCH_BASELINE_DATE,
  PRIMAL_POST_LAUNCH_OPERATING,
  PRIMAL_POST_LAUNCH_OPERATING_CONFIG,
  PRIMAL_WEBSITE_LAUNCH_DATE,
} from "@/lib/ces/content-packs/primal-post-launch";

import { PRIMAL_CLIENT_SLUG } from "./primal";

/**
 * CONTENT / SAFETY — identifies Primal for optional content-pack resolution
 * and Leadership Report access. Not used for structural compose branching.
 * Prefer getClientContentPackOperatingState / shared operating-state resolve.
 */
export function isPrimalPostLaunchClient(
  clientSlug: string | null | undefined,
): boolean {
  if (!clientSlug) return false;
  const slug = clientSlug.trim().toLowerCase();
  return slug === PRIMAL_CLIENT_SLUG || slug === "primal";
}
