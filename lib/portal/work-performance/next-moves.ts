/**
 * Next-move candidates from real available capabilities and request state.
 * Presentation only — no side effects.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import { isClientHqModuleEnabled } from "@/lib/portal/modules";
import { sanitizePortalHref } from "@/lib/portal/workspace-personalization/safe-routes";
import type { WorkPerformanceNextMove } from "./types";

export function buildWorkPerformanceNextMoves(input: {
  profile: ResolvedExperienceProfile;
  awaitingClientCount: number;
  activeReviewCount: number;
  hasAnalytics: boolean;
  completedThisMonth: number;
}): WorkPerformanceNextMove[] {
  const moves: WorkPerformanceNextMove[] = [];

  if (input.awaitingClientCount > 0 && isCesModuleEnabled(input.profile, "website-review")) {
    const href = sanitizePortalHref("/portal/website-review");
    if (href) {
      moves.push({
        id: "respond-awaiting-review",
        title: "Respond to an open website review",
        lead: "Something is waiting on your input — a short reply keeps work moving.",
        href,
      });
    }
  } else if (
    input.activeReviewCount > 0 &&
    isCesModuleEnabled(input.profile, "website-review")
  ) {
    const href = sanitizePortalHref("/portal/website-review");
    if (href) {
      moves.push({
        id: "check-active-review",
        title: "Check active website revisions",
        lead: "Website revisions are underway. Review status when you have a moment.",
        href,
      });
    }
  } else if (isCesModuleEnabled(input.profile, "website-review")) {
    const href = sanitizePortalHref("/portal/website-review/request");
    if (href) {
      moves.push({
        id: "start-website-review",
        title: "Share a website update request",
        lead: "When you have notes or screenshots, submit them through Website Review.",
        href,
      });
    }
  }

  if (input.hasAnalytics && isClientHqModuleEnabled("reports")) {
    const href = sanitizePortalHref("/portal/reports");
    if (href) {
      moves.push({
        id: "view-reports",
        title: "Review published reports",
        lead: "Open the latest published reporting for this business.",
        href,
      });
    }
  }

  if (input.completedThisMonth === 0 && isClientHqModuleEnabled("deliverables")) {
    const href = sanitizePortalHref("/portal/deliverables");
    if (href) {
      moves.push({
        id: "view-deliverables",
        title: "View deliverables",
        lead: "See shared deliverables as partnership work progresses.",
        href,
      });
    }
  }

  if (isClientHqModuleEnabled("requests") && moves.length < 3) {
    const href = sanitizePortalHref("/portal/requests");
    if (href) {
      moves.push({
        id: "open-requests",
        title: "Open partnership requests",
        lead: "Share a change or question with the KXD team.",
        href,
      });
    }
  }

  return moves.slice(0, 4);
}
