/**
 * Curated client-safe partnership milestones — keyed by client slug / Executive Memory.
 * These are relationship facts, not fabricated KPI counts.
 */

import {
  memoryToMilestones,
  memoryToStoryBeats,
} from "@/lib/executive-memory";
import type { PartnershipMilestone } from "./types";

/** Generic CES flagship milestones when no slug-specific memory exists. */
const DEFAULT_FLAGSHIP: PartnershipMilestone[] = [
  { id: "operating-portal", label: "Your partnership workspace opened", complete: true },
  { id: "review-workflow", label: "A private review rhythm introduced", complete: true },
];

export function getPartnershipMilestones(slug: string | null): PartnershipMilestone[] {
  const fromMemory = memoryToMilestones(slug);
  if (fromMemory && fromMemory.length > 0) return fromMemory;
  return DEFAULT_FLAGSHIP;
}

export function getPartnershipStoryTimeline(slug: string | null): PartnershipMilestone[] {
  const fromMemory = memoryToStoryBeats(slug);
  if (fromMemory && fromMemory.length > 0) return fromMemory;
  return getPartnershipMilestones(slug);
}
