/**
 * Phase 17B — Business Brain
 * Structured business understanding from observations.
 * Interprets patterns — never executes, mutates, or renders UI.
 */

import type { IntelligenceConfidence } from "@/lib/intelligence/types";
import type { BusinessSignalTaxonomy } from "./taxonomy";

export type BusinessSignalSeverity = "critical" | "high" | "moderate" | "low" | "positive";

export type BusinessPatternTrend = "increasing" | "stable" | "decreasing" | "novel" | "repeated";

/**
 * Interpreted business meaning derived from one or more observations.
 */
export interface BusinessSignal {
  id: string;
  taxonomy: BusinessSignalTaxonomy;
  label: string;
  /** What this means in business context — not a recommendation */
  meaning: string;
  severity: BusinessSignalSeverity;
  confidence: IntelligenceConfidence;
  observationFingerprints: string[];
  relatedClientId: number | null;
  relatedClientName: string | null;
}

/**
 * Repeated or meaningful trend across observation history.
 */
export interface BusinessPattern {
  id: string;
  taxonomy: BusinessSignalTaxonomy;
  label: string;
  description: string;
  trend: BusinessPatternTrend;
  occurrenceCount: number;
  observationFingerprints: string[];
  relatedClientId: number | null;
  relatedClientName: string | null;
}

/**
 * Something that may deserve human review — not a recommendation or action.
 */
export interface ExecutiveAttentionItem {
  id: string;
  title: string;
  /** Calm context for human review — never prescriptive */
  context: string;
  severity: BusinessSignalSeverity;
  signalIds: string[];
  patternIds: string[];
  relatedClientId: number | null;
  relatedClientName: string | null;
}

export interface BusinessBrainSummary {
  headline: string;
  narrative: string;
  dominantThemes: string[];
  overallPosture: "clear" | "active" | "pressured" | "strained";
  criticalSignalCount: number;
  positiveSignalCount: number;
}

export interface BusinessBrainInput {
  observations: import("@/lib/observer/types").Observation[];
  generatedAt: string;
  observationCount: number;
  historyRunCount: number;
  repeatedFingerprints: Array<{ fingerprint: string; count: number }>;
  stableFingerprints: string[];
  novelFingerprints: string[];
}

export type BusinessBrainResult = {
  generatedAt: string;
  observationCount: number;
  signalCount: number;
  patternCount: number;
  attentionCount: number;
  signals: BusinessSignal[];
  patterns: BusinessPattern[];
  attention: ExecutiveAttentionItem[];
  summary: BusinessBrainSummary;
};
