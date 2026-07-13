/**
 * Curated client-safe partnership milestones — keyed by client slug.
 * These are relationship facts, not fabricated KPI counts.
 */

import type { PartnershipMilestone } from "./types";

const PRIMAL_MILESTONES: PartnershipMilestone[] = [
  { id: "website-rebuilt", label: "Website rebuilt for the brand", complete: true },
  { id: "google-ads-launched", label: "Advertising launched and refined", complete: true },
  { id: "conversion-tracking", label: "Conversion tracking in place", complete: true },
  { id: "review-workflow", label: "Website review process introduced", complete: true },
  { id: "operating-portal", label: "Private partnership workspace opened", complete: true },
  { id: "executive-collaboration", label: "Closer executive collaboration", complete: true },
  { id: "launch-readiness", label: "Launch readiness strengthened", complete: true },
];

/**
 * Editorial relationship timeline — visual story beats only.
 * Truthful sequence; final beat may be incomplete when launch is ahead.
 */
const PRIMAL_STORY: PartnershipMilestone[] = [
  { id: "story-strategy", label: "Website strategy", complete: true },
  { id: "story-ads", label: "Google Ads launched", complete: true },
  { id: "story-workspace", label: "Private workspace introduced", complete: true },
  { id: "story-review", label: "Website review process", complete: true },
  { id: "story-prep", label: "Launch preparation", complete: true },
  { id: "story-launch", label: "Launch", complete: false },
];

const BY_SLUG: Record<string, PartnershipMilestone[]> = {
  "primal-motorsports": PRIMAL_MILESTONES,
};

const STORY_BY_SLUG: Record<string, PartnershipMilestone[]> = {
  "primal-motorsports": PRIMAL_STORY,
};

/** Generic CES flagship milestones when no slug-specific set exists. */
const DEFAULT_FLAGSHIP: PartnershipMilestone[] = [
  { id: "operating-portal", label: "Private partnership workspace opened", complete: true },
  { id: "review-workflow", label: "Website review process introduced", complete: true },
];

export function getPartnershipMilestones(slug: string | null): PartnershipMilestone[] {
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug];
  return DEFAULT_FLAGSHIP;
}

export function getPartnershipStoryTimeline(slug: string | null): PartnershipMilestone[] {
  if (slug && STORY_BY_SLUG[slug]) return STORY_BY_SLUG[slug];
  return getPartnershipMilestones(slug);
}
