/**
 * Phase 20F/20G — KXD Operations Experience types.
 * Permanent operational learning system for every future KXD team member.
 * Architecture from 20F preserved; 20G adds operational confidence framing.
 */

export type TrainingPathStatus = "draft" | "published" | "archived";
export type TrainingLessonStatus = "draft" | "published" | "archived";
export type TrainingProgressStatus = "not-started" | "started" | "in-progress" | "completed";

/** Future Work Engine supervised practice pipeline. */
export type TrainingWorkStage =
  | "learn"
  | "practice"
  | "review"
  | "approved"
  | "independent";

export interface TrainingResource {
  label: string;
  href?: string | null;
  note?: string | null;
}

export interface TrainingStep {
  title: string;
  detail: string;
}

/** Guided walkthrough inside KXD OS — learning in the product, not beside it. */
export interface TrainingWalkthroughStep {
  title: string;
  detail: string;
  /** Deep link into a real KXD OS surface when available. */
  href?: string | null;
  actionLabel?: string | null;
}

export interface TrainingChecklistItem {
  id: string;
  label: string;
  required?: boolean;
}

export interface TrainingImage {
  url: string;
  alt: string;
  caption?: string | null;
}

/**
 * Four-question operational frame — judgment over memorization.
 */
export interface TrainingOperationsFrame {
  /** What KXD OS already does automatically. */
  osAlreadyDoes: string[];
  /** What the learner's responsibility is. */
  yourResponsibility: string[];
  /** When to ask KXD Intelligence. */
  askIntelligenceWhen: string[];
  /** When to escalate to Matt. */
  escalateWhen: string[];
  /** What success looks like. */
  successLooksLike: string[];
}

/** Contextual mentor prompts — extension points; AI not built in 20G. */
export interface TrainingIntelligencePrompt {
  id: string;
  label: string;
  /** Suggested prompt text for future Intelligence. */
  prompt: string;
}

export type OperationalPracticeKind =
  | "website-review"
  | "invoice-verify"
  | "proposal-review"
  | "onboarding-check"
  | "communications-review"
  | "drive-organize"
  | "work-create"
  | "activity-review"
  | "custom";

/** Future supervised operational exercise — do not automate yet. */
export interface OperationalPracticeSpec {
  kind: OperationalPracticeKind;
  title: string;
  summary: string;
  practiceWorkKey: string;
  targetHref?: string | null;
}

export interface TrainingLessonContent {
  body: string;
  /** Prefer walkthrough for ops lessons; steps remain for procedures. */
  walkthrough: TrainingWalkthroughStep[];
  steps: TrainingStep[];
  operations: TrainingOperationsFrame;
  intelligencePrompts: TrainingIntelligencePrompt[];
  examples: string[];
  commonMistakes: string[];
  bestPractices: string[];
  checklist: TrainingChecklistItem[];
  resources: TrainingResource[];
  images: TrainingImage[];
  knowledgeCheckPlaceholder: string | null;
  practiceTaskPlaceholder: string | null;
  operationalPractice: OperationalPracticeSpec | null;
}

export interface TrainingLessonDefinition {
  slug: string;
  title: string;
  summary: string;
  objective: string;
  estimatedMinutes: number;
  sortOrder: number;
  status: TrainingLessonStatus;
  content: TrainingLessonContent;
  practiceWorkKey?: string | null;
  workStage?: TrainingWorkStage;
}

export interface TrainingPathDefinition {
  slug: string;
  title: string;
  summary: string;
  description: string;
  estimatedMinutes: number;
  sortOrder: number;
  status: TrainingPathStatus;
  audience: string;
  lessons: TrainingLessonDefinition[];
}

export interface TrainingLessonProgress {
  lessonSlug: string;
  pathSlug: string;
  status: TrainingProgressStatus;
  percentComplete: number;
  startedAt: string | null;
  lastViewedAt: string | null;
  completedAt: string | null;
  timeSpentSeconds: number;
  checklistCompletedIds: string[];
}

export interface TrainingLessonView extends TrainingLessonDefinition {
  pathSlug: string;
  pathTitle: string;
  href: string;
  progress: TrainingLessonProgress | null;
}

export interface TrainingPathView {
  slug: string;
  title: string;
  summary: string;
  description: string;
  estimatedMinutes: number;
  sortOrder: number;
  status: TrainingPathStatus;
  audience: string;
  href: string;
  lessonCount: number;
  completedCount: number;
  percentComplete: number;
  lessons: TrainingLessonView[];
}

/** Growth track for Executive Operations Coordinator (Heather as first learner). */
export interface OperationsGrowthTrack {
  roleTitle: string;
  roleSummary: string;
  expandingInto: string[];
  notIncluded: string[];
}

export interface TrainingDashboardData {
  learnerKey: string;
  learnerLabel: string;
  canManage: boolean;
  overallPercent: number;
  completedLessons: number;
  totalLessons: number;
  currentPathSlug: string | null;
  paths: TrainingPathView[];
  continueLesson: TrainingLessonView | null;
  recommendedLesson: TrainingLessonView | null;
  recentLessons: TrainingLessonView[];
  growthTrack: OperationsGrowthTrack;
  experienceTitle: string;
  experienceLede: string;
  generatedAt: string;
}

export interface TrainingPermissions {
  canRead: boolean;
  canTrackProgress: boolean;
  canComplete: boolean;
  canManage: boolean;
  canAssign: boolean;
}

/** Spec for future Work Engine spawn. */
export interface TrainingPracticeWorkSpec {
  practiceWorkKey: string;
  lessonSlug: string;
  pathSlug: string;
  title: string;
  summary: string;
  stage: TrainingWorkStage;
  supervised: boolean;
  suggestedWorkStatus: "new" | "in-progress" | "review";
  operationalPractice: OperationalPracticeSpec | null;
  metadata: {
    source: "training" | "operations-experience";
    trainingLessonSlug: string;
    trainingPathSlug: string;
    stage: TrainingWorkStage;
    practiceKind?: OperationalPracticeKind;
  };
}
