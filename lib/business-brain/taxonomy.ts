/**
 * Lightweight signal taxonomy — consistent categories across Brain outputs.
 */

export const BUSINESS_SIGNAL_TAXONOMY = {
  DELIVERY_PRESSURE: "business.delivery.pressure",
  RELATIONSHIP_ENGAGEMENT: "business.relationship.engagement",
  OPERATIONS_LOAD: "business.operations.load",
  OVERDUE_RISK: "business.overdue.risk",
  REVIEW_BACKLOG: "business.review.backlog",
  HEALTH_PRESSURE: "business.health.pressure",
  EXECUTION_MOMENTUM: "business.execution.momentum",
  MEMORY_LIFECYCLE: "business.memory.lifecycle",
  COMMUNICATIONS_ATTENTION: "business.communications.attention",
  CLIENT_REQUESTS: "business.client-requests.open",
} as const;

export type BusinessSignalTaxonomy =
  (typeof BUSINESS_SIGNAL_TAXONOMY)[keyof typeof BUSINESS_SIGNAL_TAXONOMY];

export const TAXONOMY_LABELS: Record<BusinessSignalTaxonomy, string> = {
  [BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE]: "Delivery pressure",
  [BUSINESS_SIGNAL_TAXONOMY.RELATIONSHIP_ENGAGEMENT]: "Relationship engagement",
  [BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD]: "Operational load",
  [BUSINESS_SIGNAL_TAXONOMY.OVERDUE_RISK]: "Overdue risk",
  [BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG]: "Review backlog",
  [BUSINESS_SIGNAL_TAXONOMY.HEALTH_PRESSURE]: "Business health pressure",
  [BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM]: "Execution momentum",
  [BUSINESS_SIGNAL_TAXONOMY.MEMORY_LIFECYCLE]: "Recommendation memory",
  [BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION]: "Communications attention",
  [BUSINESS_SIGNAL_TAXONOMY.CLIENT_REQUESTS]: "Open client requests",
};

export function taxonomyLabel(taxonomy: BusinessSignalTaxonomy): string {
  return TAXONOMY_LABELS[taxonomy];
}
