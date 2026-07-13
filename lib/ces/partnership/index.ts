export type {
  PartnershipAttention,
  PartnershipBillingPreview,
  PartnershipBriefing,
  PartnershipCurrentState,
  PartnershipDeliveredItem,
  PartnershipFutureModule,
  PartnershipMilestone,
  PartnershipModuleStatus,
  PartnershipOutcomeMetric,
  PartnershipOverview,
  PartnershipProgressItem,
  PartnershipRecommendation,
  PartnershipResults,
  PartnershipWebsiteReviewSnapshot,
} from "./types";

export { getPartnershipMilestones, getPartnershipStoryTimeline } from "./milestones";
export { getBoardFutureModules, CLIENT_CAPABILITY_REGISTRY, getReportingCapabilityIds } from "./capabilities";
export type { ClientCapabilityDefinition } from "./capabilities";
export { decideClientRecommendation } from "./recommend";

/** Server compose — import from `@/lib/ces/partnership/compose` in RSC / loaders only. */
