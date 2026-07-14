/**
 * Exactly ONE client-safe recommendation — evidence-backed presentation adapter.
 * Not Executive Intelligence. Deterministic rules only.
 * Hospitality voice — honest about what the system knows.
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
      headline: "A short note from you will keep things moving",
      rationale:
        "One open revision is waiting for your eye. A brief response is all we need — then we can continue refining with care.",
      evidenceLabels: [
        awaiting ? `Waiting on: ${awaiting.title}` : "A revision is waiting for your input",
      ],
    };
  }

  if (input.hasActiveReviews) {
    return {
      headline: "Website revisions are underway",
      rationale:
        "Active website revisions are in progress. When you're ready, a quick look from you keeps direction clear.",
      evidenceLabels: ["Website revisions in progress"],
    };
  }

  if (input.results?.optimizations.some((o) => /landing page/i.test(o))) {
    return {
      headline: "We recommend a closer look at the landing experience",
      rationale:
        "Recent advertising priorities point to the landing experience. Aligning that page with arriving interest is the clearest next step — we can guide that together.",
      evidenceLabels: ["Campaign priorities from prepared reports", "Landing experience worth reviewing"],
    };
  }

  if (input.websiteUrl) {
    return {
      headline: "Let's finish refining the site ahead of launch",
      rationale:
        "Here's the clearest picture of where things stand today. Completing the remaining website revisions is the surest path to a launch that feels worthy of the brand.",
      evidenceLabels: [
        "Website work in the current phase",
        "Your private workspace is ready for review",
      ],
    };
  }

  return {
    headline: "Keep refining what is already working",
    rationale:
      "The foundation is in place. The calm next step is polishing what already serves you well before expanding into anything new.",
    evidenceLabels: ["Partnership foundations established"],
  };
}
