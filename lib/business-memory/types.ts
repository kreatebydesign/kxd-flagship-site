/**
 * Phase 18B — Business Memory & Evolution
 * Accumulated operational understanding from trusted history.
 * Never invents history — everything traces to observations, patterns, pulse, context.
 */

import type { BusinessContext } from "@/lib/business-context";
import type { BusinessBrainResult, BusinessPattern } from "@/lib/business-brain";
import type { BusinessSignalTaxonomy } from "@/lib/business-brain/taxonomy";
import type { Observation } from "@/lib/observer/types";
import type { PulseResult } from "@/lib/pulse";

export interface BusinessMemoryHistoryRange {
  start: string;
  end: string;
}

export type BusinessMilestoneSource = "observation" | "pattern" | "pulse";

export interface BusinessMilestone {
  id: string;
  label: string;
  description: string;
  occurredAt: string;
  source: BusinessMilestoneSource;
  observationFingerprints: string[];
  taxonomy: BusinessSignalTaxonomy | null;
}

export type BusinessTrendDirection =
  | "improving"
  | "declining"
  | "stable"
  | "emerging"
  | "fading";

export interface BusinessTrend {
  id: string;
  label: string;
  description: string;
  direction: BusinessTrendDirection;
  taxonomy: BusinessSignalTaxonomy;
  occurrenceCount: number;
  observationFingerprints: string[];
}

export interface BusinessEvolution {
  id: string;
  label: string;
  description: string;
  fromState: string;
  toState: string;
  observationFingerprints: string[];
}

export type BusinessComparisonShift = "increased" | "decreased" | "stable" | "novel";

export interface BusinessComparison {
  id: string;
  label: string;
  description: string;
  earlierPeriod: string;
  laterPeriod: string;
  shift: BusinessComparisonShift;
  taxonomy: BusinessSignalTaxonomy | null;
  observationFingerprints: string[];
}

export interface BusinessMemorySummary {
  headline: string;
  narrative: string;
  dominantEvolutions: string[];
  observationRunCount: number;
  historySpanDays: number;
}

export type BusinessMemoryResult = {
  generatedAt: string;
  historyRange: BusinessMemoryHistoryRange;
  milestones: BusinessMilestone[];
  trends: BusinessTrend[];
  evolution: BusinessEvolution[];
  comparisons: BusinessComparison[];
  summary: BusinessMemorySummary;
};

export interface BusinessMemoryInput {
  brain: BusinessBrainResult;
  pulse: PulseResult;
  context: BusinessContext;
  observations: Observation[];
  historyRunCount: number;
  repeated: Array<{ fingerprint: string; count: number; latest: Observation }>;
  stable: Observation[];
  novel: Observation[];
  previousPulseSnapshots: PulseSnapshot[];
}

export interface PulseSnapshot {
  generatedAt: string;
  postureLevel: PulseResult["posture"]["level"];
  postureLabel: string;
  signalCount: number;
  changeCount: number;
  watchlistCount: number;
  priorityDomains: string[];
}

export interface BusinessMemoryTimeline {
  range: BusinessMemoryHistoryRange;
  observationCount: number;
  runCount: number;
  sourceCounts: Partial<Record<Observation["source"], number>>;
}
