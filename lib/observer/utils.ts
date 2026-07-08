import type {
  Observation,
  ObservationAutomationMeta,
  ObservationCategory,
  ObservationImportance,
  ObservationStatus,
  ObserverSource,
  RelatedObject,
  RelatedWorkspace,
} from "./types";
import type { IntelligenceConfidence } from "@/lib/intelligence/types";

export function buildFingerprint(
  source: ObserverSource,
  category: ObservationCategory,
  key: string,
): string {
  return `${source}:${category}:${key}`;
}

export function buildObservationId(fingerprint: string, occurredAt: string): string {
  const day = occurredAt.slice(0, 10);
  return `obs:${fingerprint}:${day}`;
}

export function defaultAutomationMeta(overrides: Partial<ObservationAutomationMeta> = {}): ObservationAutomationMeta {
  return {
    actionable: false,
    requiresApproval: true,
    informational: true,
    recurring: false,
    resolved: false,
    ...overrides,
  };
}

export interface MakeObservationInput {
  source: ObserverSource;
  category: ObservationCategory;
  occurredAt: string;
  recordedAt: string;
  importance?: ObservationImportance;
  confidence?: IntelligenceConfidence;
  fact: string;
  fingerprintKey: string;
  supportingEvidence?: import("./types").ObservationEvidence[];
  relatedClientId?: number | null;
  relatedClientName?: string | null;
  relatedWorkspace?: RelatedWorkspace | null;
  relatedObjects?: RelatedObject[];
  status?: ObservationStatus;
  automation?: Partial<ObservationAutomationMeta>;
}

export function makeObservation(input: MakeObservationInput): Observation {
  const fingerprint = buildFingerprint(input.source, input.category, input.fingerprintKey);
  return {
    id: buildObservationId(fingerprint, input.occurredAt),
    source: input.source,
    category: input.category,
    occurredAt: input.occurredAt,
    recordedAt: input.recordedAt,
    importance: input.importance ?? "normal",
    confidence: input.confidence ?? "high",
    fact: input.fact,
    supportingEvidence: input.supportingEvidence ?? [],
    relatedClientId: input.relatedClientId ?? null,
    relatedClientName: input.relatedClientName ?? null,
    relatedWorkspace: input.relatedWorkspace ?? null,
    relatedObjects: input.relatedObjects ?? [],
    status: input.status ?? "active",
    automation: defaultAutomationMeta(input.automation),
    fingerprint,
  };
}

export function importanceFromUrgency(
  urgency: string,
): ObservationImportance {
  if (urgency === "critical") return "critical";
  if (urgency === "high") return "high";
  if (urgency === "low") return "low";
  return "normal";
}
