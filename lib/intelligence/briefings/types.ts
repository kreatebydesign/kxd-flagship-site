import type { IntelligenceConfidence, IntelligenceUrgency } from "../types";
import type { WorkWorkspaceData } from "@/lib/work/types";
import type { IntelligenceContext } from "../types";
import type { ReviewInboxItem } from "@/lib/website-review-inbox/types";

export type BriefingSignalSource =
  | "work"
  | "timeline"
  | "website-review"
  | "communications"
  | "deliverables"
  | "client-requests"
  | "projects"
  | "platform";

export type BusinessHealthLevel = "excellent" | "healthy" | "needs-attention" | "critical";
export type RelationshipHealthLevel = "strong" | "stable" | "cooling" | "at-risk";
export type OperationalHealthLevel = "smooth" | "busy" | "strained" | "overloaded";

export type BriefingActionType =
  | "review-work"
  | "respond"
  | "unblock"
  | "follow-up"
  | "deliver"
  | "launch"
  | "review-inbox"
  | "relationship"
  | "operations";

export interface BriefingSignal {
  id: string;
  source: BriefingSignalSource;
  clientId?: number | null;
  clientName?: string;
  title: string;
  detail: string;
  occurredAt: string;
  urgency: IntelligenceUrgency;
  confidence: IntelligenceConfidence;
  businessImpact: number;
  href?: string;
}

export interface BriefingCommunicationItem {
  id: number;
  clientId: number | null;
  clientName: string;
  subject: string;
  date: string;
  status: string;
  href: string;
}

export interface BriefingInputContext {
  intelligence: IntelligenceContext;
  work: WorkWorkspaceData;
  reviewInbox: {
    newCount: number;
    activeCount: number;
    items: ReviewInboxItem[];
  };
  communications: {
    needsReplyCount: number;
    staleUnresolvedCount: number;
    overdueFollowUpCount: number;
    openCount: number;
    needsReply: BriefingCommunicationItem[];
  };
  generatedAt: string;
}

export interface BusinessHealthSection {
  level: BusinessHealthLevel;
  score: number;
  summary: string;
  factors: string[];
}

export interface BriefingChangeItem {
  id: string;
  label: string;
  detail: string;
  source: BriefingSignalSource;
  occurredAt: string;
  href?: string;
}

export interface BriefingPriority {
  id: string;
  title: string;
  reason: string;
  businessImpact: number;
  urgency: IntelligenceUrgency;
  confidence: IntelligenceConfidence;
  clientName?: string;
  href?: string;
  supportingSignals: string[];
}

export interface BriefingRisk {
  id: string;
  title: string;
  reason: string;
  urgency: IntelligenceUrgency;
  confidence: IntelligenceConfidence;
  clientName?: string;
  href?: string;
  supportingSignals: string[];
}

export interface BriefingOpportunity {
  id: string;
  title: string;
  reason: string;
  confidence: IntelligenceConfidence;
  clientName?: string;
  href?: string;
  supportingSignals: string[];
}

export interface RelationshipHealthSection {
  level: RelationshipHealthLevel;
  score: number;
  summary: string;
  signals: string[];
}

export interface OperationalHealthSection {
  level: OperationalHealthLevel;
  score: number;
  summary: string;
  signals: string[];
}

export interface BriefingRecommendation {
  id: string;
  title: string;
  reason: string;
  businessImpact: number;
  confidence: IntelligenceConfidence;
  actionType: BriefingActionType;
  supportingSignals: string[];
  estimatedValue: number | null;
  href?: string;
  clientName?: string;
}

export type RecommendationCategory =
  | "operations"
  | "client-success"
  | "website"
  | "marketing"
  | "projects"
  | "deliverables"
  | "reviews"
  | "relationship";

export type RecommendationEffortLabel =
  | "5 minutes"
  | "15 minutes"
  | "30 minutes"
  | "1 hour"
  | "Half day"
  | "Full day";

export interface RecommendationEvidence {
  id: string;
  source: BriefingSignalSource;
  label: string;
  detail?: string;
  href?: string;
}

export interface RecommendationHistoryNote {
  type: "previously-shown" | "previously-completed" | "previously-dismissed" | "previously-ignored" | "similar-completed";
  message: string;
}

export interface IntelligentRecommendation extends BriefingRecommendation {
  signalConfidence: IntelligenceConfidence;
  whyAppeared: string;
  expectedImpact: string;
  effort: RecommendationEffortLabel;
  category: RecommendationCategory;
  evidence: RecommendationEvidence[];
  historyNotes: RecommendationHistoryNote[];
  generatedAt: string;
}

export interface PlatformStatusItem {
  label: string;
  status: "ok" | "attention" | "warning";
  detail: string;
}

export interface PlatformStatusSection {
  summary: string;
  items: PlatformStatusItem[];
}

export interface ExecutiveNarrative {
  text: string;
  sentences: string[];
}

export interface ExecutiveHealthSnapshot {
  business: { level: string; score: number; label: string };
  relationship: { level: string; score: number; label: string };
  operational: { level: string; score: number; label: string };
  overall: { level: BusinessHealthLevel; score: number; label: string };
}

export type ExecutiveInsightTone = "positive" | "neutral" | "observational" | "quiet";

export interface ExecutiveInsightContext {
  id: string;
  source: BriefingSignalSource;
  label: string;
  detail?: string;
  href?: string;
}

export interface ExecutiveInsight {
  id: string;
  observation: string;
  whatChanged: string;
  whyItMatters: string;
  tone: ExecutiveInsightTone;
  timeframe: string;
  confidence?: IntelligenceConfidence;
  clientName?: string;
  relatedRecommendationId?: string;
  relatedHealthArea?: "business" | "relationship" | "operational";
  context: ExecutiveInsightContext[];
}

export interface ExecutiveBriefing {
  greeting: string;
  dateDisplay: string;
  timeDisplay: string;
  narrative: ExecutiveNarrative;
  healthSnapshot: ExecutiveHealthSnapshot;
  primaryRecommendation: IntelligentRecommendation | null;
  executiveInsights: ExecutiveInsight[];
  businessHealth: BusinessHealthSection;
  whatChanged: BriefingChangeItem[];
  topPriorities: BriefingPriority[];
  businessRisks: BriefingRisk[];
  businessOpportunities: BriefingOpportunity[];
  relationshipHealth: RelationshipHealthSection;
  operationalHealth: OperationalHealthSection;
  recommendedActions: IntelligentRecommendation[];
  platformStatus: PlatformStatusSection;
  generatedAt: string;
  confidence: IntelligenceConfidence;
}
