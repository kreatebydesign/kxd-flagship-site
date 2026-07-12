/**
 * Phase 21B — KXD Intelligence Layer
 *
 * Permanent operational reasoning system for KXD OS.
 * Not a chatbot. Not an assistant. Not UI.
 *
 * Observe → Remember → Reason → Recommend → Teach → Warn → Learn
 * Every recommendation has a reason. Never overwhelm.
 */

export type IntelligenceConfidence = "low" | "medium" | "high";

export type IntelligenceUrgency = "low" | "medium" | "high" | "critical";

export type IntelligenceDisposition =
  | "act-now"
  | "consider"
  | "remember"
  | "monitor";

export type IntelligenceDomain =
  | "executive"
  | "workspace"
  | "client"
  | "work"
  | "learning"
  | "activity"
  | "review"
  | "finance"
  | "business-development"
  | "calendar"
  | "operations";

export type IntelligenceSourceId =
  | "business-brain"
  | "observer"
  | "pulse"
  | "executive-narrative"
  | "executive-activity"
  | "business-memory"
  | "client-success"
  | "work-engine"
  | "website-review"
  | "training-progress"
  | "executive-workspace"
  | "legacy-intelligence"
  | "finance"
  | "business-development"
  | "calendar";

/**
 * Core contract — every insight answers the same questions.
 */
export interface IntelligenceInsight {
  id: string;
  domain: IntelligenceDomain;
  title: string;
  /** What happened? */
  whatHappened: string;
  /** Why does it matter? */
  whyItMatters: string;
  /** What should happen next? */
  whatShouldHappenNext: string;
  confidence: IntelligenceConfidence;
  urgency: IntelligenceUrgency;
  disposition: IntelligenceDisposition;
  /** Should the user act now? */
  shouldActNow: boolean;
  /** Should this simply be remembered? */
  shouldRemember: boolean;
  sourceIds: IntelligenceSourceId[];
  relatedClientId?: number | null;
  relatedWorkId?: number | null;
  relatedHref?: string | null;
  explanation?: IntelligenceExplanation | null;
  generatedAt: string;
}

export interface IntelligenceRecommendation {
  id: string;
  title: string;
  reason: string;
  suggestedAction: string;
  confidence: IntelligenceConfidence;
  urgency: IntelligenceUrgency;
  shouldActNow: boolean;
  sourceIds: IntelligenceSourceId[];
  relatedClientId?: number | null;
  relatedHref?: string | null;
  explanation?: IntelligenceExplanation | null;
  generatedAt: string;
}

export interface OperationalWarning {
  id: string;
  title: string;
  whatHappened: string;
  whyItMatters: string;
  whatShouldHappenNext: string;
  confidence: IntelligenceConfidence;
  urgency: IntelligenceUrgency;
  shouldActNow: boolean;
  sourceIds: IntelligenceSourceId[];
  relatedClientId?: number | null;
  relatedHref?: string | null;
  explanation?: IntelligenceExplanation | null;
  generatedAt: string;
}

/**
 * Future-facing explanation surface — "Why am I seeing this?"
 */
export interface IntelligenceExplanation {
  whyVisible: string;
  whyRecommended: string;
  influencingData: IntelligenceEvidenceItem[];
  confidenceRationale: string;
  confidence: IntelligenceConfidence;
}

export interface IntelligenceEvidenceItem {
  sourceId: IntelligenceSourceId;
  label: string;
  detail: string;
}

export type IntelligenceWorkspaceId =
  | "morning-brief"
  | "client-success"
  | "work-engine"
  | "operations-experience"
  | "website-review"
  | "executive-workspace"
  | "activity-center"
  | "operations"
  | "sales"
  | "focus"
  | "review";

export interface IntelligenceQueryContext {
  workspaceId?: IntelligenceWorkspaceId | null;
  clientId?: number | null;
  workId?: number | null;
  learnerKey?: string | null;
  pathSlug?: string | null;
  lessonSlug?: string | null;
  limit?: number;
}

export interface IntelligenceBundle {
  generatedAt: string;
  executive: IntelligenceInsight[];
  recommendations: IntelligenceRecommendation[];
  warnings: OperationalWarning[];
  sourcesAvailable: IntelligenceSourceId[];
}

/** Learning architecture — adaptive answers arrive later. */
export interface LearningIntelligenceView {
  insight: IntelligenceInsight | null;
  strugglingAreas: string[];
  suggestedNextLesson: string | null;
  showAdditionalGuidance: boolean;
  notifyMatt: boolean;
  rationale: string;
  architectureReady: true;
}

/** Work architecture — priority questions reserved for later wiring. */
export interface WorkIntelligenceView {
  insight: IntelligenceInsight | null;
  isOverdue: boolean | null;
  isBlocking: boolean | null;
  clientAtRisk: boolean | null;
  canWait: boolean | null;
  shouldBeTodayPriority: boolean | null;
  openQuestions: string[];
  architectureReady: true;
}

/** Client architecture — relationship health questions reserved. */
export interface ClientIntelligenceView {
  insight: IntelligenceInsight | null;
  needsAttention: boolean | null;
  becomingUnhealthy: boolean | null;
  primaryRecommendation: IntelligenceRecommendation | null;
  openQuestions: string[];
  architectureReady: true;
}
