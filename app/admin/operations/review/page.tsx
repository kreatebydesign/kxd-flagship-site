/**
 * /admin/operations/review
 * Phase 16C — Weekly Review ritual mode
 */

import { ReviewModeScreen } from "@/components/admin/operations/rituals/ReviewModeScreen";
import { getExecutiveTimelineDashboard } from "@/lib/executive-timeline";
import { getExecutiveBriefing } from "@/lib/intelligence/briefings";
import { buildWeeklyReview } from "@/lib/rituals/review-builder";
import { getWorkWorkspace } from "@/lib/work/server";

export const dynamic = "force-dynamic";

export default async function ReviewModePage() {
  const [briefing, work, timeline] = await Promise.all([
    getExecutiveBriefing(),
    getWorkWorkspace(),
    getExecutiveTimelineDashboard(),
  ]);
  const review = buildWeeklyReview(briefing, work, timeline.recentEvents);
  return <ReviewModeScreen review={review} />;
}
