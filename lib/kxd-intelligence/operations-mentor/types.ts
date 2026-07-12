/**
 * Phase 21C — Operations Intelligence Mentor
 * Structured contextual guidance for Operations Experience.
 * Not a chatbot. Not open-ended generation.
 */

import type { IntelligenceConfidence } from "../types";
import type { MentorCapabilityId } from "./capabilities";

export type { MentorCapabilityId };

export type GuidanceMode = "deterministic" | "interpreted";

export type GuidanceTaskComplexity = "lookup" | "review" | "judgment" | "escalation";

export type ArtifactReviewKind =
  | "lesson-checklist"
  | "invoice"
  | "proposal"
  | "client-communication"
  | "work-item"
  | "onboarding"
  | "hr-documentation";

export interface OperationsMentorContext {
  learnerKey: string;
  learnerLabel: string;
  pathSlug: string;
  pathTitle: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonSummary: string;
  lessonObjective: string;
  lessonBody: string;
  operationsFrame: {
    osAlreadyDoes: string[];
    yourResponsibility: string[];
    askIntelligenceWhen: string[];
    escalateWhen: string[];
    successLooksLike: string[];
  };
  walkthrough: Array<{
    title: string;
    detail: string;
    href?: string | null;
  }>;
  examples: string[];
  commonMistakes: string[];
  bestPractices: string[];
  checklist: Array<{ id: string; label: string; required?: boolean }>;
  checklistCompletedIds: string[];
  progressStatus: string | null;
  relatedWorkspaceHref: string | null;
  practiceKind: string | null;
  practiceTitle: string | null;
  learnerNote: string | null;
  capability: MentorCapabilityId;
}

export interface ChecklistCorrection {
  missingRequiredIds: string[];
  missingLabels: string[];
  completedCount: number;
  requiredCount: number;
  readyToComplete: boolean;
  guidance: string;
}

export interface ArtifactReviewPlaceholder {
  kind: ArtifactReviewKind;
  supportedNow: boolean;
  summary: string;
}

/**
 * Mentor response contract — short, calm, beginner-friendly.
 */
export interface OperationsGuidanceResponse {
  capability: MentorCapabilityId;
  conciseAnswer: string;
  recommendedNextStep: string;
  reason: string;
  confidence: IntelligenceConfidence;
  involveMatt: boolean;
  mattReason: string | null;
  relatedHref: string | null;
  relatedLabel: string | null;
  checklistCorrection: ChecklistCorrection | null;
  warning: string | null;
  needsClarification: boolean;
  clarificationPrompt: string | null;
  mode: GuidanceMode;
  taskComplexity: GuidanceTaskComplexity;
  /** Future artifact review surface. */
  artifactReview: ArtifactReviewPlaceholder | null;
  usage: MentorUsageMeta;
}

export interface MentorUsageMeta {
  requestId: string;
  cached: boolean;
  deduped: boolean;
  mode: GuidanceMode;
  capability: MentorCapabilityId;
  pathSlug: string;
  lessonSlug: string;
  /** Length of learner note only — never store full prompt text in logs. */
  noteLength: number;
  generatedAt: string;
}

export interface OperationsGuidanceRequest {
  capability: MentorCapabilityId;
  pathSlug: string;
  lessonSlug: string;
  checklistCompletedIds?: string[];
  learnerNote?: string | null;
  /** Client-supplied idempotency key for rapid duplicate control. */
  clientRequestKey?: string | null;
}

export interface MentorUsageLogEntry {
  requestId: string;
  capability: MentorCapabilityId;
  pathSlug: string;
  lessonSlug: string;
  learnerKeyHash: string;
  mode: GuidanceMode;
  cached: boolean;
  deduped: boolean;
  noteLength: number;
  involveMatt: boolean;
  at: string;
}
