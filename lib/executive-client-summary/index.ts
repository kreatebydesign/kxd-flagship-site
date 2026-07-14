/**
 * Phase 32A.1 — Executive Client Summary / Briefing (Shared Core).
 * Server loaders live in ./load (server-only) — import explicitly from there.
 */

export type {
  BriefingMetricSource,
  ExecutiveBriefingChapter,
  ExecutiveBriefingMetric,
  ExecutiveBriefingResults,
  ExecutiveBriefingWorkItem,
  ExecutiveClientBriefing,
  ExecutiveClientBriefingUnavailable,
  ExecutiveClientSummary,
  ExecutiveClientSummarySection,
} from "./types";

export {
  composeExecutiveClientBriefing,
  composeExecutiveClientSummary,
  type ComposeExecutiveClientBriefingInput,
  type ComposeExecutiveClientSummaryInput,
} from "./compose";

export { isExecutiveClientBriefingAvailable } from "./availability";
