/**
 * KXD Academy daily quests — static definitions with live progress where available.
 * Phase 3: persistence, completion tracking, and dynamic quest rotation.
 */

export type QuestId =
  | "submit-leads"
  | "complete-lesson"
  | "detailed-notes"
  | "review-website";

export type QuestDefinition = {
  id: QuestId;
  title: string;
  description: string;
  target: number;
};

export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: "submit-leads",
    title: "Submit 3 leads",
    description: "Add three strong research opportunities to the KXD pipeline today.",
    target: 3,
  },
  {
    id: "complete-lesson",
    title: "Complete 1 Academy lesson",
    description: "Work through one training module to sharpen your research eye.",
    target: 1,
  },
  {
    id: "detailed-notes",
    title: "Add detailed notes to 1 lead",
    description: "Include context that helps the team qualify and act on your submission.",
    target: 1,
  },
  {
    id: "review-website",
    title: "Review 1 website opportunity",
    description: "Evaluate a prospect's web presence and flag fit for KXD website work.",
    target: 1,
  },
];

export type QuestContext = {
  submittedToday: number;
  leadsWithNotes: number;
  websiteOpportunityLeads: number;
};

export type QuestView = QuestDefinition & {
  current: number;
  complete: boolean;
};

export function evaluateDailyQuests(ctx: QuestContext): QuestView[] {
  const progress: Record<QuestId, number> = {
    "submit-leads": Math.min(ctx.submittedToday, 3),
    "complete-lesson": 0,
    "detailed-notes": Math.min(ctx.leadsWithNotes, 1),
    "review-website": Math.min(ctx.websiteOpportunityLeads, 1),
  };

  return DAILY_QUESTS.map((quest) => {
    const current = progress[quest.id];
    return {
      ...quest,
      current,
      complete: current >= quest.target,
    };
  });
}

export function getQuestsCompletedCount(quests: QuestView[]): number {
  return quests.filter((q) => q.complete).length;
}

export function getQuestsSummaryLabel(completed: number, total: number): string {
  return `${completed}/${total} Complete`;
}
