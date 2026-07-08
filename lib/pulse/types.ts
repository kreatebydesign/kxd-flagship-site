/**
 * Phase 17C — Pulse Engine
 * Continuous executive state from Business Brain + observation history.
 * Describes awareness — never recommends, automates, or renders UI.
 */

import type { BusinessBrainResult, BusinessSignalSeverity } from "@/lib/business-brain";
import type { BusinessSignalTaxonomy } from "@/lib/business-brain/taxonomy";
import type { Observation } from "@/lib/observer/types";

export type BusinessPostureLevel =
  | "quiet"
  | "stable"
  | "active"
  | "busy"
  | "elevated"
  | "critical";

export interface BusinessPosture {
  level: BusinessPostureLevel;
  label: string;
  description: string;
}

export type PulseChangeDirection =
  | "increased"
  | "decreased"
  | "new"
  | "resolved"
  | "unchanged";

export type PulseSignificance = "high" | "moderate" | "low";

export type PulseChangeTaxonomy = BusinessSignalTaxonomy | "observation.novel";

export interface PulseChange {
  id: string;
  taxonomy: PulseChangeTaxonomy;
  label: string;
  description: string;
  direction: PulseChangeDirection;
  significance: PulseSignificance;
  signalIds: string[];
  observationFingerprints: string[];
}

export interface PulseWatchItem {
  id: string;
  label: string;
  context: string;
  durationRuns: number;
  severity: BusinessSignalSeverity;
  taxonomy: BusinessSignalTaxonomy;
  signalIds: string[];
  patternIds: string[];
}

export interface StableSignal {
  id: string;
  label: string;
  description: string;
  taxonomy: BusinessSignalTaxonomy;
  observationFingerprints: string[];
  runCount: number;
}

export type ExecutivePriorityDomain =
  | "delivery"
  | "operations"
  | "relationships"
  | "financial-health"
  | "marketing"
  | "reviews"
  | "brand"
  | "communications";

export interface ExecutivePriority {
  id: string;
  domain: ExecutivePriorityDomain;
  label: string;
  /** Descriptive context — executive attention domain, not an action */
  context: string;
  weight: number;
  signalIds: string[];
  patternIds: string[];
}

export type ExecutiveDigestTone = "calm" | "neutral" | "alert" | "urgent";

export interface ExecutiveDigest {
  headline: string;
  narrative: string;
  topChanges: string[];
  watchItems: string[];
  stableAreas: string[];
  overallTone: ExecutiveDigestTone;
}

export type PulseItemKind = "change" | "awareness" | "watch" | "stable" | "novel";

export interface PulseItem {
  id: string;
  kind: PulseItemKind;
  title: string;
  description: string;
  significance: PulseSignificance;
  taxonomy: BusinessSignalTaxonomy | null;
  relatedClientId: number | null;
  relatedClientName: string | null;
}

export type PulseResult = {
  generatedAt: string;
  pulseItems: PulseItem[];
  changes: PulseChange[];
  watchlist: PulseWatchItem[];
  stableSignals: StableSignal[];
  priorities: ExecutivePriority[];
  posture: BusinessPosture;
  executiveDigest: ExecutiveDigest;
};

export interface PulseInput {
  brain: BusinessBrainResult;
  previousBrain: BusinessBrainResult | null;
  observationCount: number;
  historyRunCount: number;
  previousPulse: PulseResult | null;
  delta: { added: Observation[]; unchanged: Observation[] } | null;
  repeated: Array<{ fingerprint: string; count: number; latest: Observation }>;
  stable: Observation[];
  novel: Observation[];
}
