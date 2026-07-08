/**
 * Phase 17A — The Observer
 * Normalized observation model. Facts only — never opinions.
 */

import type { IntelligenceConfidence } from "@/lib/intelligence/types";

/** Subsystem that produced the observation */
export type ObserverSource =
  | "timeline"
  | "work"
  | "review"
  | "communications"
  | "client-request"
  | "deliverables"
  | "business-health"
  | "relationship-health"
  | "operational-health"
  | "brain-memory";

/** Semantic grouping within a source */
export type ObservationCategory =
  | "event"
  | "state"
  | "threshold"
  | "health-signal"
  | "memory"
  | "lifecycle";

export type ObservationImportance = "critical" | "high" | "normal" | "low";

export type ObservationStatus = "active" | "resolved" | "superseded" | "informational";

export type RelatedWorkspace =
  | "operations"
  | "work-engine"
  | "review-inbox"
  | "timeline"
  | "communications"
  | "portal"
  | "intelligence"
  | "brain";

export interface ObservationEvidence {
  id: string;
  label: string;
  detail?: string;
  href?: string;
  value?: string | number | boolean;
}

export interface RelatedObject {
  type: string;
  id: string | number;
  label?: string;
  href?: string;
}

/**
 * Automation readiness metadata — consumed by future Automation Engine.
 * Observer never executes automations.
 */
export interface ObservationAutomationMeta {
  /** Future automation may act on this observation */
  actionable: boolean;
  /** Human approval required before any automated action */
  requiresApproval: boolean;
  /** Awareness only — no action expected */
  informational: boolean;
  /** Pattern has appeared before in observation history */
  recurring: boolean;
  /** Underlying condition is no longer active */
  resolved: boolean;
}

/**
 * Normalized business observation — a single verifiable fact.
 */
export interface Observation {
  /** Stable deterministic identifier */
  id: string;
  /** Observer module that produced this observation */
  source: ObserverSource;
  category: ObservationCategory;
  /** When the underlying fact occurred */
  occurredAt: string;
  /** When the observer recorded this observation */
  recordedAt: string;
  importance: ObservationImportance;
  confidence: IntelligenceConfidence;
  /** Factual statement — no recommendations */
  fact: string;
  supportingEvidence: ObservationEvidence[];
  relatedClientId: number | null;
  relatedClientName: string | null;
  relatedWorkspace: RelatedWorkspace | null;
  relatedObjects: RelatedObject[];
  status: ObservationStatus;
  automation: ObservationAutomationMeta;
  /** Dedup key for history — same fact across runs */
  fingerprint: string;
}

export interface ObservationRunResult {
  observations: Observation[];
  generatedAt: string;
  observerCount: number;
  sourceCounts: Record<ObserverSource, number>;
}

export interface ObserverModule {
  id: ObserverSource;
  label: string;
  observe: (ctx: import("./context").ObserverContext) => Observation[];
}
