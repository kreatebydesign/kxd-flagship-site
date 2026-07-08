import type { BusinessDomainKey, BusinessModel, ContextObservationPattern } from "./types";

export const BUSINESS_DOMAIN_LABELS: Record<BusinessDomainKey, string> = {
  delivery: "Delivery",
  operations: "Operations",
  relationships: "Relationships",
  "financial-health": "Financial Health",
  marketing: "Marketing",
  reviews: "Reviews",
  brand: "Brand",
  communications: "Communications",
};

export const DOMAIN_DESCRIPTIONS: Record<BusinessDomainKey, string> = {
  delivery: "Timelines, commitments, and delivery posture.",
  operations: "Execution load, capacity, and operational flow.",
  relationships: "Client, partner, and stakeholder engagement.",
  "financial-health": "Revenue, margin, and business health signals.",
  marketing: "Growth, visibility, and market-facing activity.",
  reviews: "Review cycles, feedback, and revision flow.",
  brand: "Brand reputation, memory, and positioning.",
  communications: "Threads, follow-ups, and correspondence.",
};

type InterpretationLensMap = Record<
  ContextObservationPattern,
  Partial<Record<BusinessModel, string>>
>;

/**
 * Contextual meaning lenses — same fact, different business interpretation.
 * These do not override observations. They provide interpretation context only.
 */
export const INTERPRETATION_LENSES: InterpretationLensMap = {
  "delivery.delay": {
    "creative-agency": "Delivery capacity may need awareness.",
    construction: "Schedule variance may impact commitments.",
    restaurant: "Launch timeline risk may require attention.",
    "professional-services": "Engagement timelines may need review.",
    saas: "Release or milestone timing may need awareness.",
    retail: "Fulfillment or rollout timing may need awareness.",
    custom: "Delivery timing may need awareness.",
  },
  "delivery.pressure": {
    "creative-agency": "Studio delivery load is elevated across client work.",
    construction: "Project schedule pressure is visible across active jobs.",
    restaurant: "Opening or service readiness pressure is building.",
    "professional-services": "Client commitment load is elevated.",
    saas: "Release or roadmap pressure is present.",
    retail: "Fulfillment or seasonal delivery pressure is present.",
    custom: "Delivery pressure is present.",
  },
  "operations.load": {
    "creative-agency": "Studio execution load is carrying measurable weight.",
    construction: "Field and coordination load is elevated.",
    restaurant: "Opening or service operations load is elevated.",
    "professional-services": "Team capacity is under measurable load.",
    saas: "Engineering or operations load is elevated.",
    retail: "Store or fulfillment operations load is elevated.",
    custom: "Operational load is elevated.",
  },
  "operations.blocked": {
    "creative-agency": "Blocked work may be slowing client delivery.",
    construction: "Blocked work may be delaying site progress.",
    restaurant: "Blocked readiness work may affect opening milestones.",
    "professional-services": "Blocked work may delay client outcomes.",
    saas: "Blocked work may affect release momentum.",
    retail: "Blocked operations may affect customer fulfillment.",
    custom: "Blocked work is present in operations.",
  },
  "relationship.inactivity": {
    "creative-agency": "Client engagement may be cooling across partnerships.",
    construction: "Client or subcontractor communication may be thinning.",
    restaurant: "Community or partner engagement may be quiet.",
    "professional-services": "Client touchpoints may be less frequent than usual.",
    saas: "Account engagement may be cooling.",
    retail: "Customer or partner engagement may be quiet.",
    custom: "Relationship activity appears quieter than usual.",
  },
  "relationship.engagement": {
    "creative-agency": "Client relationship activity is visible and healthy.",
    construction: "Stakeholder engagement is active across projects.",
    restaurant: "Community and partner engagement is building.",
    "professional-services": "Client engagement is active.",
    saas: "Account engagement is active.",
    retail: "Customer engagement is visible.",
    custom: "Relationship engagement is present.",
  },
  "review.backlog": {
    "creative-agency": "Website review volume is building in the inbox.",
    construction: "Inspection or approval backlog may need awareness.",
    restaurant: "Opening checklist or permit review volume is building.",
    "professional-services": "Deliverable review volume is building.",
    saas: "Feature or content review backlog is building.",
    retail: "Merchandising or content review volume is building.",
    custom: "Review backlog is present.",
  },
  "communications.stale": {
    "creative-agency": "Client threads may be waiting on studio response.",
    construction: "Site or client communications may need follow-up.",
    restaurant: "Vendor or partner threads may need follow-up.",
    "professional-services": "Client correspondence may need follow-up.",
    saas: "Customer or stakeholder threads may need follow-up.",
    retail: "Customer or vendor threads may need follow-up.",
    custom: "Communication follow-up may be overdue.",
  },
  "health.pressure": {
    "creative-agency": "Studio business health signals warrant awareness.",
    construction: "Project portfolio health signals warrant awareness.",
    restaurant: "Opening or operating health signals warrant awareness.",
    "professional-services": "Practice health signals warrant awareness.",
    saas: "Business health signals warrant awareness.",
    retail: "Store or business health signals warrant awareness.",
    custom: "Business health signals warrant awareness.",
  },
  "execution.momentum": {
    "creative-agency": "Work is moving forward across the studio.",
    construction: "Field progress is visible across active work.",
    restaurant: "Opening readiness work is advancing.",
    "professional-services": "Client work is advancing.",
    saas: "Product or delivery momentum is visible.",
    retail: "Operational momentum is visible.",
    custom: "Execution momentum is present.",
  },
};

export function domainLabel(key: BusinessDomainKey): string {
  return BUSINESS_DOMAIN_LABELS[key];
}

export function domainWeight(
  context: { importantDomains: Array<{ key: BusinessDomainKey; weight: number }> },
  key: BusinessDomainKey,
): number {
  const match = context.importantDomains.find((domain) => domain.key === key);
  return match?.weight ?? 0;
}

export function topDomains(
  context: { importantDomains: Array<{ key: BusinessDomainKey; weight: number; label: string }> },
  limit = 3,
): string[] {
  return [...context.importantDomains]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((domain) => domain.label);
}

export function contextualMeaningForPattern(
  pattern: ContextObservationPattern,
  businessModel: BusinessModel,
  genericMeaning: string,
): string {
  const lens = INTERPRETATION_LENSES[pattern];
  if (!lens) return genericMeaning;

  return (
    lens[businessModel] ??
    lens.custom ??
    genericMeaning
  );
}
