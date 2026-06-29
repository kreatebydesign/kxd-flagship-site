export type MemoryInsightCategory =
  | "win"
  | "risk"
  | "follow_up"
  | "opportunity"
  | "retainer"
  | "upsell"
  | "context";

export type MemorySeverity = "low" | "medium" | "high" | "critical";

export type MemoryActionCategory =
  | "communication"
  | "revenue"
  | "project"
  | "infrastructure"
  | "relationship"
  | "growth";

export interface MemorySourceRef {
  label: string;
  href: string;
}

export interface MemorySignal {
  id: string;
  category: MemoryInsightCategory;
  severity: MemorySeverity;
  title: string;
  detail: string;
  source?: string;
  href?: string;
}

export interface MemoryInsightItem {
  id: string;
  title: string;
  detail: string;
  severity?: MemorySeverity;
  source?: MemorySourceRef;
}

export interface ClientMemoryScores {
  relationshipHealthScore: number;
  revenueOpportunityScore: number;
  urgencyScore: number;
  retentionRiskScore: number;
  momentumScore: number;
}

export interface ClientMemoryAction {
  id: string;
  label: string;
  reason: string;
  href: string;
  category: MemoryActionCategory;
  priority: MemorySeverity;
}

export interface ClientMemorySnapshot {
  clientId: number;
  clientName: string;
  executiveSummary: string[];
  currentStatus: string;
  wins: MemoryInsightItem[];
  risks: MemoryInsightItem[];
  followUpsNeeded: MemoryInsightItem[];
  revenueOpportunities: MemoryInsightItem[];
  retainerOpportunities: MemoryInsightItem[];
  upsellIdeas: MemoryInsightItem[];
  relationshipHealth: string;
  memoryNotes: MemoryInsightItem[];
  scores: ClientMemoryScores;
  nextBestActions: ClientMemoryAction[];
  generatedAt: string;
}

/** Future AI adapter — pass structured memory to LLM without recomputing rules. */
export interface ClientMemoryAiPayload {
  clientId: number;
  clientName: string;
  scores: ClientMemoryScores;
  executiveSummary: string[];
  signals: MemorySignal[];
  nextBestActions: ClientMemoryAction[];
  generatedAt: string;
}
