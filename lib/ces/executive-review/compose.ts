/**
 * Compose Executive Review for a resolved CES profile.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { isExecutiveReviewAvailable } from "./availability";
import { getExecutiveReviewPack } from "./registry";
import type { ExecutiveReviewPack } from "./types";

export type ExecutiveReviewComposeResult =
  | { available: true; pack: ExecutiveReviewPack }
  | { available: false; reason: "not-entitled" | "no-pack" };

export function composeExecutiveReview(
  profile: ResolvedExperienceProfile,
): ExecutiveReviewComposeResult {
  const slug = profile.identity.clientSlug;
  if (!isExecutiveReviewAvailable(profile)) {
    const hasPack = Boolean(slug && getExecutiveReviewPack(slug));
    return { available: false, reason: hasPack ? "not-entitled" : "no-pack" };
  }

  const pack = getExecutiveReviewPack(slug);
  if (!pack) {
    return { available: false, reason: "no-pack" };
  }

  return { available: true, pack };
}
