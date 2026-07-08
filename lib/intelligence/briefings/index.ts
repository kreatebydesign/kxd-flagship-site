export { buildExecutiveBriefing, getExecutiveBriefing, loadBriefingContext } from "./builder";
export { buildBusinessHealth, buildRelationshipHealth, buildOperationalHealth } from "./health";
export { buildBriefingGreeting, buildBriefingOverview } from "./overview";
export { buildWhatChanged } from "./summaries";
export { buildTopPriorities } from "./priorities";
export { buildBusinessRisks } from "./risks";
export { buildBusinessOpportunities } from "./opportunities";
export {
  buildRecommendedActions,
  buildPlatformStatus,
  computeBriefingConfidence,
} from "./sections";
export {
  BRIEFING_SIGNAL_SOURCES,
  getBriefingSignalSource,
  listActiveBriefingSources,
} from "./registry";

export type {
  BriefingSignalSource,
  BusinessHealthLevel,
  RelationshipHealthLevel,
  OperationalHealthLevel,
  BriefingActionType,
  BriefingSignal,
  BriefingInputContext,
  BusinessHealthSection,
  BriefingChangeItem,
  BriefingPriority,
  BriefingRisk,
  BriefingOpportunity,
  RelationshipHealthSection,
  OperationalHealthSection,
  BriefingRecommendation,
  PlatformStatusItem,
  PlatformStatusSection,
  ExecutiveBriefing,
} from "./types";

export type { BriefingSignalSourceDefinition } from "./registry";
