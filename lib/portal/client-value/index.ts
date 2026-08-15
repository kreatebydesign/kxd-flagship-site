/**
 * Client Value Projection — Batch 1
 *
 * Presentation adapter over Work & Performance + infrastructure renewal readiness.
 * Not a new intelligence engine. Portal rendering must stay free of live provider calls.
 */

export type {
  ClientCareContinuity,
  ClientCareContinuityLine,
  ClientCareContinuityStatus,
  ClientPerformanceStory,
  ClientPerformanceStoryTone,
  ClientValueAvailability,
  ClientValueInfraAllowlistKey,
  ClientValueProjection,
} from "./types";

export {
  CLIENT_VALUE_INFRA_ALLOWLIST,
  CLIENT_VALUE_INFRA_DENYLIST,
} from "./types";

export {
  composeCareContinuity,
  type ComposeCareContinuityInput,
} from "./care-continuity";

export { composePerformanceStory } from "./performance-story";
export type { ComposePerformanceStoryInput } from "./performance-story";

export {
  composeClientValueProjection,
  type ComposeClientValueInput,
} from "./compose";
