/** Phase 8B — Website QA & Launch Readiness */

export type LaunchQaStatus =
  | "draft"
  | "in-progress"
  | "blocked"
  | "ready"
  | "approved"
  | "launched"
  | "archived";

export type LaunchQaItemStatus = "pending" | "pass" | "fail" | "skip" | "na";

export type LaunchQaItemSeverity = "critical" | "warning" | "info";

export type LaunchRecommendation =
  | "not-ready"
  | "needs-review"
  | "ready-to-launch"
  | "approved";

export type LaunchQaCategoryId =
  | "pre-launch"
  | "design-qa"
  | "responsive-qa"
  | "content-qa"
  | "seo-qa"
  | "technical-qa"
  | "analytics-qa"
  | "forms-qa"
  | "domain-dns-qa"
  | "performance-qa"
  | "accessibility-qa"
  | "legal-trust-qa"
  | "post-launch";

export interface LaunchQaChecklistItem {
  id: string;
  categoryId: LaunchQaCategoryId;
  title: string;
  description: string;
  required: boolean;
  status: LaunchQaItemStatus;
  notes?: string;
  severity: LaunchQaItemSeverity;
  relatedModule?: string;
  completedAt?: string;
}

export interface LaunchQaCategorySummary {
  id: LaunchQaCategoryId;
  label: string;
  completed: number;
  total: number;
  requiredComplete: number;
  requiredTotal: number;
}

export interface LaunchQaBlocker {
  itemId: string;
  title: string;
  severity: LaunchQaItemSeverity;
}

export interface LaunchQaScores {
  readinessScore: number;
  criticalBlockerCount: number;
  warningCount: number;
  completedRequired: number;
  requiredTotal: number;
  completedOptional: number;
  optionalTotal: number;
  recommendation: LaunchRecommendation;
}

export interface LaunchQaListItem {
  id: number;
  clientId: number;
  clientName: string;
  projectId: number | null;
  websiteUrl: string | null;
  status: LaunchQaStatus;
  launchDate: string | null;
  readinessScore: number;
  recommendation: LaunchRecommendation;
  criticalBlockers: number;
  updatedAt: string;
  href: string;
  clientHref: string;
}

export interface LaunchQaDetail {
  id: number;
  clientId: number;
  clientName: string;
  projectId: number | null;
  websiteUrl: string | null;
  status: LaunchQaStatus;
  launchDate: string | null;
  readinessScore: number;
  notes: string | null;
  checklistItems: LaunchQaChecklistItem[];
  categories: LaunchQaCategorySummary[];
  blockers: LaunchQaBlocker[];
  warnings: LaunchQaBlocker[];
  scores: LaunchQaScores;
  recommendation: LaunchRecommendation;
  checkedBy: string | null;
  approvedBy: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  playbookHref: string;
}

export interface LaunchQaPortfolioData {
  sessions: LaunchQaListItem[];
  totals: {
    open: number;
    blocked: number;
    ready: number;
    approved: number;
    launched: number;
    avgScore: number;
  };
}

export interface LaunchQaCommandSummary {
  qaId: number | null;
  href: string | null;
  status: LaunchQaStatus | "none";
  readinessScore: number;
  recommendation: LaunchRecommendation | "none";
  criticalBlockers: number;
  openItems: number;
  launchDate: string | null;
}

export interface LaunchQaMonthlyActivity {
  sessionsCompleted: number;
  blockersResolved: number;
  postLaunchCompleted: number;
  readinessImprovement: number;
  lines: string[];
}

/** Future architecture — interfaces only */
export interface LaunchQaFutureCapabilities {
  lighthouseApi: boolean;
  playwrightChecks: boolean;
  brokenLinkCrawler: boolean;
  accessibilityScanner: boolean;
  screenshotComparison: boolean;
  searchConsoleVerification: boolean;
  ga4Verification: boolean;
}

export const LAUNCH_QA_FUTURE_CAPABILITIES: LaunchQaFutureCapabilities = {
  lighthouseApi: false,
  playwrightChecks: false,
  brokenLinkCrawler: false,
  accessibilityScanner: false,
  screenshotComparison: false,
  searchConsoleVerification: false,
  ga4Verification: false,
};
