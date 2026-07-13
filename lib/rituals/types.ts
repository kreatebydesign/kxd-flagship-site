/**
 * Phase 16C — Daily Ritual Framework
 * Presentation modes, not separate products.
 */

import type { IntelligenceUrgency } from "@/lib/intelligence/types";

export type RitualMode = "morning" | "focus" | "review" | "planning";

export type WorkspaceEmotion =
  | "confidence"
  | "progress"
  | "momentum"
  | "relationships"
  | "resolution"
  | "partnership"
  | "control"
  | "clarity";

export interface WorkspaceEmotionMap {
  workspace: string;
  emotion: WorkspaceEmotion;
  objective: string;
}

export interface RitualReadingEstimate {
  minutes: number;
  label: string;
}

export interface FocusPriority {
  id: string;
  title: string;
  reason: string;
  href?: string;
  urgency: IntelligenceUrgency;
}

export interface FocusWorkItem {
  id: number;
  title: string;
  clientName: string;
  status: string;
  href: string;
}

export interface FocusDecision {
  id: string;
  title: string;
  reason: string;
  href?: string;
  whatToDo?: string;
  whatToIgnore?: string;
  whatCanWait?: string;
  whyThisBlock?: string;
  whenToStop?: string;
}

export interface FocusContext {
  greeting: string;
  dateDisplay: string;
  priorities: FocusPriority[];
  todaysWork: FocusWorkItem[];
  urgentDecisions: FocusDecision[];
  blockers: FocusWorkItem[];
  affirmation: string;
  intelligence?: import("./intelligence/types").FocusIntelligence;
  /** Phase 28B — canonical engine decision for focus. */
  primaryDecision?: FocusDecision;
  explainability?: import("@/lib/executive-intelligence").UserFacingExplainability | null;
}

export interface WeeklyReviewWin {
  id: string;
  label: string;
  detail: string;
}

export interface WeeklyReviewLesson {
  id: string;
  observation: string;
}

export interface WeeklyReview {
  greeting: string;
  weekLabel: string;
  dateDisplay: string;
  completedWork: Array<{ id: number; title: string; clientName: string; completedAt: string }>;
  businessProgress: string[];
  relationshipProgress: Array<{ id: string; title: string; detail: string; occurredAt: string }>;
  wins: WeeklyReviewWin[];
  risks: Array<{ id: string; title: string; reason: string }>;
  lessons: WeeklyReviewLesson[];
  nextWeekPriorities: FocusPriority[];
  affirmation: string;
  readingEstimate: RitualReadingEstimate;
  intelligence?: import("./intelligence/types").WeeklyReviewIntelligence;
}
