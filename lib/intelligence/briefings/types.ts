import type { IntelligenceConfidence, IntelligenceUrgency } from "../types";
import type { WorkWorkspaceData } from "@/lib/work/types";
import type { IntelligenceContext } from "../types";

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

export interface BriefingInputContext {
  intelligence: IntelligenceContext;
  work: WorkWorkspaceData;
  reviewInbox: { newCount: number; activeCount: number };
  communications: {
    needsReplyCount: number;
    staleUnresolvedCount: number;
    overdueFollowUpCount: number;
    openCount: number;
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

export interface PlatformStatusItem {
  label: string;
  status: "ok" | "attention" | "warning";
  detail: string;
}

export interface PlatformStatusSection {
  summary: string;
  items: PlatformStatusItem[];
}

export interface ExecutiveBriefing {
  greeting: string;
  dateDisplay: string;
  timeDisplay: string;
  businessHealth: BusinessHealthSection;
  whatChanged: BriefingChangeItem[];
  topPriorities: BriefingPriority[];
  businessRisks: BriefingRisk[];
  businessOpportunities: BriefingOpportunity[];
  relationshipHealth: RelationshipHealthSection;
  operationalHealth: OperationalHealthSection;
  recommendedActions: BriefingRecommendation[];
  platformStatus: PlatformStatusSection;
  generatedAt: string;
  confidence: IntelligenceConfidence;
}
