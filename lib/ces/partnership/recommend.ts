/**
 * Exactly ONE client-safe recommendation — evidence-backed presentation adapter.
 * Not Executive Intelligence. Deterministic rules only.
 */

import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { PartnershipRecommendation, PartnershipResults } from "./types";

export interface RecommendInput {
  websiteReview: WebsiteReviewLandingData;
  hasAwaitingClient: boolean;
  hasActiveReviews: boolean;
  results: PartnershipResults | null;
  websiteUrl: string | null;
}

export function decideClientRecommendation(input: RecommendInput): PartnershipRecommendation {
  if (input.hasAwaitingClient) {
    const awaiting = input.websiteReview.activeReviews.find(
      (r) => r.status === "awaiting-your-input",
    );
    return {
      headline: "Respond to the open revision",
      rationale:
        "A revision is waiting on your input. A short response keeps momentum and clears the path to launch.",
      evidenceLabels: [
        awaiting ? `Open revision: ${awaiting.title}` : "Revision awaiting your input",
      ],
    };
  }

  if (input.hasActiveReviews) {
    return {
      headline: "Review the latest website updates",
      rationale:
        "Active revisions are in motion. Confirming direction now keeps the site moving toward launch with clarity.",
      evidenceLabels: ["Website revisions in progress"],
    };
  }

  if (input.results?.optimizations.some((o) => /landing page/i.test(o))) {
    return {
      headline: "Review the landing page experience",
      rationale:
        "Campaign work is healthy. The next leverage point is aligning the landing experience with qualified traffic.",
      evidenceLabels: ["Campaign optimization priorities", "Landing page review recommended"],
    };
  }

  if (input.websiteUrl) {
    return {
      headline: "Finalize website revisions ahead of launch",
      rationale:
        "The clearest next step is completing remaining website revisions so the site meets the standard the brand deserves.",
      evidenceLabels: [
        "Website rebuild in the current phase",
        "Private workspace ready for review collaboration",
      ],
    };
  }

  return {
    headline: "Continue optimization",
    rationale:
      "Core systems are in place. Stay focused on refining what is already working before expanding scope.",
    evidenceLabels: ["Partnership systems established"],
  };
}
