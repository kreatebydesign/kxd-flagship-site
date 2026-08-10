/**
 * verify-partnership-briefing.ts
 *
 * Client-safe partnership briefing invariants for board presentation.
 * Run: npm run verify:partnership-briefing
 */

import assert from "node:assert/strict";
import {
  CLIENT_CAPABILITY_REGISTRY,
  getBoardFutureModules,
  getPartnershipMilestones,
  getPartnershipStoryTimeline,
  decideClientRecommendation,
} from "../lib/ces/partnership";
import type { WebsiteReviewLandingData } from "../lib/ces/modules/website-review/types";

let passed = 0;

function check(label: string, condition: boolean) {
  assert.ok(condition, label);
  passed += 1;
  console.log(`  ✔ ${label}`);
}

const emptyReview: WebsiteReviewLandingData = {
  websiteUrl: "https://primalmotorsports.com",
  activeReviews: [],
  completedReviews: [],
};

function main() {
  console.log("\nPartnership briefing verification\n");

  const milestones = getPartnershipMilestones("primal-motorsports");
  check("Primal milestones present", milestones.length >= 5);
  check(
    "All Primal milestones marked complete",
    milestones.every((m) => m.complete),
  );

  const story = getPartnershipStoryTimeline("primal-motorsports");
  check("Editorial story timeline present", story.length >= 5);
  check("Launch remains ahead on timeline", story.some((b) => !b.complete));

  const modules = getBoardFutureModules();
  check("Future modules listed", modules.length >= 8);
  check(
    "Every module has honest status label",
    modules.every((m) => ["Planned", "In Development", "Available Next"].includes(m.statusLabel)),
  );
  check(
    "Entitled future-module ids are omitted from the opportunity board",
    getBoardFutureModules(["seo", "google-ads"]).every(
      (module) => module.id !== "seo" && module.id !== "google-ads",
    ),
  );
  check("Capability registry is Shared Core ready", CLIENT_CAPABILITY_REGISTRY.length >= 10);

  const rec = decideClientRecommendation({
    websiteReview: emptyReview,
    hasAwaitingClient: false,
    hasActiveReviews: false,
    results: null,
    websiteUrl: emptyReview.websiteUrl,
  });
  check("Exactly one recommendation headline", Boolean(rec.headline));
  check("Recommendation has evidence", rec.evidenceLabels.length >= 1);
  check(
    "Default recommendation stays evidence-bound",
    rec.headline === "No current action is required" &&
      rec.evidenceLabels.includes("Website on file") &&
      !/launch/i.test(`${rec.headline} ${rec.rationale}`),
  );

  const awaitingRec = decideClientRecommendation({
    websiteReview: {
      ...emptyReview,
      activeReviews: [
        {
          id: "9",
          title: "Homepage hero",
          summary: "Please review",
          details: "Please review",
          status: "awaiting-your-input",
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: [],
          timeline: [],
        },
      ],
    },
    hasAwaitingClient: true,
    hasActiveReviews: true,
    results: null,
    websiteUrl: emptyReview.websiteUrl,
  });
  check(
    "Awaiting-client recommendation asks for response",
    /note|respond|revision/i.test(`${awaitingRec.headline} ${awaitingRec.rationale}`),
  );

  console.log(`\n${passed} checks passed.\n`);
}

main();
