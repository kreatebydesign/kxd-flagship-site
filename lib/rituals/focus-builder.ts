/**
 * Phase 28B — Focus Mode presentation over Executive Intelligence.
 * Does not create a separate focus priority algorithm.
 */

import "server-only";

import {
  composeExecutiveIntelligence,
  mapRecommendationToFocusDecision,
} from "@/lib/executive-intelligence";
import type { UserFacingExplainability } from "@/lib/executive-intelligence";
import type { ExecutiveBriefing } from "@/lib/intelligence/briefings/types";
import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import type { WorkListItem, WorkWorkspaceData } from "@/lib/work/types";
import { getDelightAffirmation } from "./delight";
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
  briefingContext?: BriefingInputContext | null,
): FocusContext & {
  primaryDecision: FocusDecision & {
    whatToDo?: string;
    whatToIgnore?: string;
    whatCanWait?: string;
    whyThisBlock?: string;
    whenToStop?: string;
  };
  explainability: UserFacingExplainability | null;
} {
  // Supporting context only — not a competing primary
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

  const surface = composeExecutiveIntelligence({
    observedAt: briefing.generatedAt,
    briefing: briefingContext ?? null,
  });

  const mapped = mapRecommendationToFocusDecision(
    surface.recommendation,
    surface.userExplainability,
  );

  const primaryDecision = {
    id: mapped.id,
    title: mapped.title,
    reason: mapped.reason,
    href: mapped.href,
    whatToDo: mapped.whatToDo,
    whatToIgnore: mapped.whatToIgnore,
    whatCanWait: mapped.whatCanWait,
    whyThisBlock: mapped.whyThisBlock,
    whenToStop: mapped.whenToStop,
  };

  const urgentDecisions: FocusDecision[] = [primaryDecision];

  for (const risk of briefing.businessRisks.slice(0, 2)) {
    if (risk.id === primaryDecision.id) continue;
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
    greeting: briefing.greeting,
    dateDisplay: briefing.dateDisplay,
    priorities,
    todaysWork,
    urgentDecisions: urgentDecisions.slice(0, 4),
    blockers: blocked,
    affirmation,
    intelligence,
    primaryDecision,
    explainability: surface.userExplainability,
  };
}
