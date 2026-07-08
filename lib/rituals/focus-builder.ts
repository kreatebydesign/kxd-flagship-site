import "server-only";

import type { ExecutiveBriefing } from "@/lib/intelligence/briefings/types";
import type { WorkListItem, WorkWorkspaceData } from "@/lib/work/types";
import { getDelightAffirmation, morningGreeting } from "./delight";
import type { FocusIntelligence } from "./intelligence/types";
import type { FocusContext, FocusDecision, FocusPriority, FocusWorkItem } from "./types";

function toFocusWorkItem(item: WorkListItem): FocusWorkItem {
  return {
    id: item.id,
    title: item.title,
    clientName: item.clientName,
    status: item.status,
    href: item.adminHref,
  };
}

function isDueToday(item: WorkListItem): boolean {
  if (!item.dueDate) return false;
  const due = new Date(item.dueDate);
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

export function buildFocusContext(
  briefing: ExecutiveBriefing,
  work: WorkWorkspaceData,
  intelligence?: FocusIntelligence,
): FocusContext {
  const priorities: FocusPriority[] = briefing.topPriorities.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    reason: item.reason,
    href: item.href,
    urgency: item.urgency,
  }));

  const blocked = work.currentWork
    .filter((item) => item.status === "blocked")
    .map(toFocusWorkItem);

  const inProgress = work.inProgress.map(toFocusWorkItem);
  const review = work.review.map(toFocusWorkItem);
  const dueToday = work.currentWork.filter(isDueToday).map(toFocusWorkItem);

  const todaysWork = [...dueToday, ...inProgress, ...review]
    .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
    .slice(0, 8);

  const urgentDecisions: FocusDecision[] = [];

  if (briefing.primaryRecommendation) {
    urgentDecisions.push({
      id: briefing.primaryRecommendation.id,
      title: briefing.primaryRecommendation.title,
      reason: briefing.primaryRecommendation.reason,
      href: briefing.primaryRecommendation.href,
    });
  }

  for (const risk of briefing.businessRisks.slice(0, 2)) {
    urgentDecisions.push({
      id: risk.id,
      title: risk.title,
      reason: risk.reason,
      href: risk.href,
    });
  }

  const hasBlockers = blocked.length > 0;
  const hasWork = todaysWork.length > 0;
  const hasAttention = (intelligence?.attentionAreas.length ?? 0) > 0;
  const affirmation = getDelightAffirmation(
    !hasBlockers && !hasWork && !hasAttention ? "focus-clear" : "morning-busy",
  );

  return {
    greeting: morningGreeting(),
    dateDisplay: briefing.dateDisplay,
    priorities,
    todaysWork,
    urgentDecisions: urgentDecisions.slice(0, 4),
    blockers: blocked,
    affirmation,
    intelligence,
  };
}
