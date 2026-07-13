/**
 * Client-safe partnership briefing — presentation adapter for portal overview.
 *
 * NOT Executive Intelligence.
 * Does not import lib/executive-intelligence, business-brain, pulse, or narrative.
 * Facts and curated partnership milestones only — no fake metrics.
 */

export type PartnershipModuleStatus = "planned" | "in-development" | "available-next";

export type PartnershipEvidenceKind = "computed" | "curated" | "report";

export interface PartnershipOverview {
  relationshipStatus: string;
  currentPhase: string;
  currentFocus: string;
  lastMajorMilestone: string;
  nextMilestone: string;
  recommendationLine: string;
}

export interface PartnershipMilestone {
  id: string;
  label: string;
  complete: boolean;
}

export interface PartnershipDeliveredItem {
  id: string;
  label: string;
  /** Null when qualitative only — never invent a number. */
  value: number | null;
  detail: string;
  evidence: PartnershipEvidenceKind;
}

export interface PartnershipCurrentState {
  initiative: string;
  websiteStage: string;
  reviewState: string;
  outstandingClientAction: string | null;
  outstandingKxdAction: string | null;
  partnershipHealth: string;
}

export interface PartnershipAttention {
  /** Exactly one client action, or null when nothing is required. */
  action: string | null;
  href: string | null;
  emptyMessage: string;
}

export interface PartnershipWebsiteReviewSnapshot {
  statusLabel: string;
  timelineLabel: string;
  latestRevisionTitle: string | null;
  latestRevisionHref: string | null;
  latestKxdResponse: string | null;
  nextStep: string;
  attachmentCount: number;
  websiteUrl: string | null;
  hasRevisions: boolean;
}

export interface PartnershipProgressItem {
  id: string;
  label: string;
  detail?: string;
  at: string | null;
}

export interface PartnershipOutcomeMetric {
  label: string;
  value: string;
}

export interface PartnershipResults {
  eyebrow: string;
  title: string;
  outcomes: string[];
  periodLabel: string | null;
  metrics: PartnershipOutcomeMetric[];
  optimizations: string[];
  hasDetailedMetrics: boolean;
}

export interface PartnershipRecommendation {
  headline: string;
  rationale: string;
  evidenceLabels: string[];
}

export interface PartnershipStrategicRoadmap {
  title: string;
  lead: string;
  ctaLabel: string;
  href: string;
}

export interface PartnershipFutureModule {
  id: string;
  label: string;
  status: PartnershipModuleStatus;
  statusLabel: string;
}

export interface PartnershipBillingPreview {
  title: string;
  lead: string;
  capabilities: string[];
  previewNote: string;
  retainerOnFile: boolean;
}

export interface PartnershipBriefing {
  clientSlug: string | null;
  clientName: string;
  overview: PartnershipOverview;
  sincePartnering: PartnershipMilestone[];
  delivered: PartnershipDeliveredItem[];
  currentState: PartnershipCurrentState;
  needsAttention: PartnershipAttention;
  websiteReview: PartnershipWebsiteReviewSnapshot;
  recentProgress: PartnershipProgressItem[];
  results: PartnershipResults | null;
  recommendation: PartnershipRecommendation;
  strategicRoadmap: PartnershipStrategicRoadmap | null;
  futureModules: PartnershipFutureModule[];
  billingPreview: PartnershipBillingPreview;
}
