/**
 * Executive Review availability — CES module + authored pack.
 */

import { isCesModuleEnabled, type ResolvedExperienceProfile } from "@/lib/ces/types";
import { hasExecutiveReviewPack } from "./registry";

export function isExecutiveReviewEntitled(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "executive-review"));
}

export function isExecutiveReviewAvailable(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  if (!profile?.identity.clientSlug) return false;
  if (!isExecutiveReviewEntitled(profile)) return false;
  return hasExecutiveReviewPack(profile.identity.clientSlug);
}
