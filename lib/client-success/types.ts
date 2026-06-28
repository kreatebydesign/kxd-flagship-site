/** Phase 7F — Client Success Engine types */

export type SatisfactionLevel = "poor" | "fair" | "good" | "high" | "excellent";

export interface ClientSuccessListItem {
  clientId: number;
  clientName: string;
  healthScore: number;
  successScore: number | null;
  relationshipStatus: string;
  lastMeetingDate: string | null;
  daysSinceMeeting: number | null;
  nextReview: string | null;
  daysUntilReview: number | null;
  renewalDate: string | null;
  daysUntilRenewal: number | null;
  currentFocus: string | null;
  href: string;
  detail?: string;
}

export interface CheckInListItem {
  id: number;
  clientId: number;
  clientName: string;
  meetingDate: string;
  summary: string;
  wins: string | null;
  satisfaction: SatisfactionLevel | null;
  completed: boolean;
  followUpDate: string | null;
  href: string;
}

export interface ClientSuccessDashboardData {
  needingAttention: ClientSuccessListItem[];
  upcomingReviews: ClientSuccessListItem[];
  renewals: ClientSuccessListItem[];
  staleMeetings: ClientSuccessListItem[];
  decliningHealth: ClientSuccessListItem[];
  expansionOpportunities: ClientSuccessListItem[];
  satisfiedClients: ClientSuccessListItem[];
  newestWins: CheckInListItem[];
  stats: {
    activeClients: number;
    plansCount: number;
    checkInsThisMonth: number;
    reviewsDue: number;
    renewalsDue: number;
    staleMeetingCount: number;
  };
  generatedAt: string;
}

export interface ClientSuccessDetailData {
  clientId: number;
  clientName: string;
  planId: number | null;
  accountManager: string | null;
  executiveSummary: string[];
  quarterlyGoals: string | null;
  yearlyGoals: string | null;
  currentFocus: string | null;
  carePlan: string | null;
  risks: string | null;
  opportunities: string | null;
  notes: string | null;
  successScore: number | null;
  healthScore: number;
  relationshipStatus: string;
  renewalDate: string | null;
  daysUntilRenewal: number | null;
  nextReview: string | null;
  daysUntilReview: number | null;
  recentWins: CheckInListItem[];
  checkInHistory: CheckInListItem[];
  timelineHighlights: Array<{ title: string; summary: string; date: string }>;
  recommendedAction: string;
  planHref: string;
  generatedAt: string;
}

export interface ClientSuccessSummary {
  successScore: number | null;
  healthScore: number;
  nextReview: string | null;
  daysUntilReview: number | null;
  quarterlyGoals: string | null;
  currentFocus: string | null;
  recentWins: string[];
  snapshot: string;
  href: string;
}

export interface ClientSuccessMonthActivity {
  checkInsCompleted: number;
  wins: string[];
  goalsAchieved: string[];
  renewalReadiness: string;
  expansionNotes: string[];
}

/** Future-ready interfaces — not implemented in Phase 7F */
export interface NpsSurveyPlaceholder {
  clientId: number;
  score: number;
  collectedAt: string;
}

export interface ClientFeedbackFormPlaceholder {
  clientId: number;
  formId: string;
  status: "draft" | "sent" | "completed";
}

export interface RenewalForecastPlaceholder {
  clientId: number;
  projectedRenewalDate: string;
  confidence: number;
}

export interface CustomerLifetimeValuePlaceholder {
  clientId: number;
  lifetimeValue: number;
  projectedValue: number;
}

export interface ReferralTrackingPlaceholder {
  clientId: number;
  referralCount: number;
  lastReferralAt: string | null;
}

export interface AccountHealthTrendPlaceholder {
  clientId: number;
  points: Array<{ date: string; score: number }>;
}

export const SATISFACTION_LABELS: Record<SatisfactionLevel, string> = {
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  high: "High",
  excellent: "Excellent",
};
