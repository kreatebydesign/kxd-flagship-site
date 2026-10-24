/**
 * /admin/operations/review
 * Phase 16C — Weekly Review ritual mode
 * Phase 18A — Intelligence stack integration
 */

import { ReviewModeScreen } from "@/components/admin/operations/rituals/ReviewModeScreen";
import { getExecutiveTimelineDashboard } from "@/lib/executive-timeline";
import { getExecutiveBriefing } from "@/lib/intelligence/briefings";
import {
  buildWeeklyReviewIntelligence,
  loadRitualIntelligence,
} from "@/lib/rituals/intelligence";
import { buildWeeklyReview } from "@/lib/rituals/review-builder";
import { getWorkWorkspace } from "@/lib/work/server";

export const dynamic = "force-dynamic";

export default async function ReviewModePage() {
  const [briefing, work, timeline, intelligenceBundle] = await Promise.all([
    getExecutiveBriefing(),
    getWorkWorkspace(),
    getExecutiveTimelineDashboard(),
    loadRitualIntelligence(),
  ]);
  const intelligence = buildWeeklyReviewIntelligence(intelligenceBundle);
  const review = buildWeeklyReview(briefing, work, timeline.recentEvents, intelligence);
  return <ReviewModeScreen review={review} />;
}
