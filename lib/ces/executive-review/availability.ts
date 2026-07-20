/**
 * Executive Review availability — CES module + authored pack.
 */

import { isCesModuleEnabled, type ResolvedExperienceProfile } from "@/lib/ces/types";
import { hasExecutiveReviewPack } from "./registry";

export function isExecutiveReviewAvailable(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  if (!profile?.identity.clientSlug) return false;
  if (!isCesModuleEnabled(profile, "executive-review")) return false;
  return hasExecutiveReviewPack(profile.identity.clientSlug);
}
