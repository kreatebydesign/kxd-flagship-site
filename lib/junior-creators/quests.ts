/**
 * KXD Academy daily challenges — static definitions with live progress where available.
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
    title: "Submit 3 discoveries",
    description: "Find three real businesses worth sharing with the KXD team today.",
    target: 3,
  },
  {
    id: "complete-lesson",
    title: "Complete 1 mission",
    description: "Finish one Academy mission and write down what you noticed.",
    target: 1,
  },
  {
    id: "detailed-notes",
    title: "Add detailed notes to 1 discovery",
    description: "Explain what you saw — website problems, brand gaps, or why they need help.",
    target: 1,
  },
  {
    id: "review-website",
    title: "Review 1 website like a detective",
    description: "Pick a business site and list what's working and what's not.",
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
