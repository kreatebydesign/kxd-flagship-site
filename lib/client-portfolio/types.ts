import type {
  ExecutivePriorityLevel,
  ExecutiveRelationshipStatus,
  MergedExecutiveClientRow,
} from "@/lib/executive-client-profile";

export type PortfolioViewId = "all" | "attention";

export type PortfolioSortId = "priority" | "name" | "revenue" | "next-due";

export type ClientEngagementStatus = "active" | "paused" | "archived" | "prospect";

export type ProfileCoverageFilter = "any" | "with-profile" | "without-profile";

export interface PortfolioFilterState {
  query: string;
  view: PortfolioViewId;
  engagementStatus: ClientEngagementStatus | "";
  executiveRelationship: ExecutiveRelationshipStatus | "";
  internalPriority: ExecutivePriorityLevel | "";
  tier: string;
  profileCoverage: ProfileCoverageFilter;
  sort: PortfolioSortId;
}

export const DEFAULT_PORTFOLIO_FILTERS: PortfolioFilterState = {
  query: "",
  view: "all",
  engagementStatus: "",
  executiveRelationship: "",
  internalPriority: "",
  tier: "",
  profileCoverage: "any",
  sort: "priority",
};

export type PortfolioRow = MergedExecutiveClientRow;

export type AttentionReasonCode =
  | "critical-priority"
  | "high-priority"
  | "executive-at-risk"
  | "relationship-needs-attention"
  | "relationship-health-at-risk"
  | "duplicate"
  | "profile-pending"
  | "next-action-overdue";

export interface AttentionReason {
  code: AttentionReasonCode;
  label: string;
}

export interface PortfolioFilterResult {
  rows: PortfolioRow[];
  attentionCount: number;
}