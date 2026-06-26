import type { IntelligenceConfidence, IntelligenceUrgency } from "@/lib/intelligence/types";

export type BrainSignalKind =
  | "revenue-risk"
  | "growth-opportunity"
  | "relationship-risk"
  | "infrastructure-risk"
  | "reporting-due"
  | "meeting-due"
  | "proposal-stalled"
  | "seo-opportunity"
  | "retainer-opportunity"
  | "automation-failure"
  | "delivery-risk"
  | "strategy-reminder";

export interface BrainSignal {
  id: string;
  kind: BrainSignalKind;
  title: string;
  reason: string;
  urgency: IntelligenceUrgency;
  confidence: IntelligenceConfidence;
  estimatedValue: number | null;
  suggestedAction: string;
  relatedModule: string;
  clientId?: number | null;
  clientName?: string | null;
  href?: string;
}

export interface BrainPattern {
  id: string;
  label: string;
  description: string;
  severity: IntelligenceUrgency;
  clientId?: number | null;
  clientName?: string | null;
  metric?: number;
}

export interface BrainPrediction {
  id: string;
  label: string;
  estimate: string;
  confidence: IntelligenceConfidence;
  basis: string;
  clientId?: number | null;
  clientName?: string | null;
}

export interface AgencyPulse {
  period: "daily" | "weekly" | "monthly";
  agencyHealth: number;
  revenueTrend: string;
  relationshipTrend: string;
  infrastructureTrend: string;
  deliveryTrend: string;
  salesTrend: string;
  executiveWorkload: string;
  growthScore: number;
  highlights: string[];
}

export interface BrainRecommendation {
  id: string;
  title: string;
  reason: string;
  urgency: IntelligenceUrgency;
  confidence: IntelligenceConfidence;
  estimatedValue: number | null;
  suggestedAction: string;
  relatedModules: string[];
  clientId?: number | null;
  clientName?: string | null;
  href?: string;
  suppressed?: boolean;
}

export interface BrainMemoryRecord {
  id: number;
  recommendationId: string;
  action: "shown" | "dismissed" | "completed" | "ignored";
  clientId?: number | null;
  title?: string | null;
  createdAt: string;
}

export interface BrainSearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  clientId?: number | null;
  clientName?: string | null;
}

export interface BrainStatus {
  lastBuiltAt: string;
  signalCount: number;
  patternCount: number;
  predictionCount: number;
  modulesConnected: string[];
  memoryEvents: number;
  futureLlmReady: boolean;
}

export interface BrainSnapshot {
  signals: BrainSignal[];
  patterns: BrainPattern[];
  predictions: BrainPrediction[];
  dailyPulse: AgencyPulse;
  weeklyPulse: AgencyPulse;
  monthlyPulse: AgencyPulse;
  topRisks: BrainSignal[];
  topOpportunities: BrainSignal[];
  recommendations: BrainRecommendation[];
  recommendationHistory: BrainMemoryRecord[];
  status: BrainStatus;
}

/** Future LLM adapter — no provider implemented in Phase 7A */
export interface LlmReasoningAdapter {
  id: string;
  label: string;
  isConfigured(): boolean;
  enrichReasoning?(snapshot: BrainSnapshot): Promise<BrainSnapshot | null>;
}

export const LLM_ADAPTER_PLACEHOLDERS = [
  { id: "openai", label: "OpenAI", status: "not-configured" as const },
  { id: "claude", label: "Claude", status: "not-configured" as const },
  { id: "gemini", label: "Gemini", status: "not-configured" as const },
  { id: "local-llm", label: "Local LLM", status: "not-configured" as const },
] as const;

export interface SemanticSearchAdapter {
  id: string;
  isConfigured(): boolean;
  search?(query: string, limit?: number): Promise<BrainSearchResult[]>;
}
