/**
 * Phase 16C — Daily Ritual Framework
 * Client-safe exports only. Server builders imported directly by pages.
 */

export { WORKSPACE_EMOTIONS, emotionForWorkspace } from "./emotions";
export {
  countWords,
  estimateReadingMinutes,
  formatReadingTime,
} from "./reading-time";
export {
  getDelightAffirmation,
  morningGreeting,
  type DelightContext,
} from "./delight";
export type {
  RitualMode,
  WorkspaceEmotion,
  WorkspaceEmotionMap,
  RitualReadingEstimate,
  FocusContext,
  FocusPriority,
  FocusWorkItem,
  FocusDecision,
  WeeklyReview,
  WeeklyReviewWin,
  WeeklyReviewLesson,
} from "./types";
