/**
 * Phase 23B — Executive Signal Engine
 * Filters, scores, groups Activity Engine events for founder attention.
 * Does not create events or store a parallel stream.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";

export type SignalImportance = "low" | "normal" | "high" | "critical";
export type SignalUrgency = "low" | "medium" | "high" | "critical";
export type SignalVisibility = "executive" | "history";
export type SignalFreshness = "fresh" | "recent" | "aging" | "stale";

export type SignalDomain =
  | "client"
  | "work"
  | "review"
  | "finance"
  | "training"
  | "onboarding"
  | "relationship"
  | "system"
  | "calendar"
  | "business-development"
  | "notifications";

export interface SignalScore {
  importance: SignalImportance;
  urgency: SignalUrgency;
  freshness: SignalFreshness;
  /** 0–100 business impact estimate from event taxonomy. */
  businessImpact: number;
  requiresAttention: boolean;
  visibility: SignalVisibility;
  /** Composite rank used for ordering (higher = better). */
  rank: number;
}

export interface ExecutiveSignal {
  id: string;
  title: string;
  summary: string | null;
  href: string | null;
  domain: SignalDomain;
  score: SignalScore;
  /** Underlying activity ids (1+ when grouped). */
  sourceActivityIds: string[];
  sourceCount: number;
  occurredAt: string;
  clientId: number | null;
  clientName: string | null;
  eventType: string;
  grouped: boolean;
}

export interface ExecutiveSignalsResult {
  signals: ExecutiveSignal[];
  suppressedCount: number;
  scannedCount: number;
  emptyMessage: string;
  generatedAt: string;
}

export const EXECUTIVE_SIGNALS_EMPTY_MESSAGE =
  "No significant business changes since your last session." as const;

export const EXECUTIVE_SIGNALS_LIMIT = 6;
export const EXECUTIVE_SIGNALS_FETCH = 40;

export interface ExecutiveSignalsInput {
  /** Pre-loaded activity — preferred to avoid duplicate fetches. */
  activity?: ExecutiveActivityItem[];
  limit?: number;
}
