import type {
  BusinessContext,
  BusinessDomain,
  BusinessGoal,
  BusinessModel,
  BusinessPriority,
  SuccessIndicator,
} from "./types";

const NOW = "2026-01-01T00:00:00.000Z";

function priority(
  key: BusinessPriority["key"],
  label: string,
  weight: number,
): BusinessPriority {
  return { id: `priority:${key}`, key, label, weight };
}

function domain(
  key: BusinessDomain["key"],
  label: string,
  weight: number,
): BusinessDomain {
  return { id: `domain:${key}`, key, label, weight };
}

function goal(
  id: string,
  label: string,
  horizon: BusinessGoal["horizon"],
  emphasis: BusinessGoal["emphasis"],
): BusinessGoal {
  return { id, label, horizon, emphasis };
}

function success(
  id: string,
  label: string,
  domainKey: SuccessIndicator["domain"],
  description: string,
): SuccessIndicator {
  return { id, label, domain: domainKey, description };
}

/** Kreate by Design — default studio operating context for KXD OS */
export const KXD_STUDIO_BUSINESS_CONTEXT: BusinessContext = {
  id: "business-context:kxd-studio",
  businessName: "Kreate by Design",
  industry: "Creative & digital services",
  businessModel: "creative-agency",
  operatingStyle: "founder-led",
  maturity: "established",
  priorities: [
    priority("delivery", "Client delivery", 90),
    priority("relationships", "Client relationships", 85),
    priority("quality", "Creative quality", 80),
    priority("brand", "Studio brand", 75),
    priority("revenue", "Revenue health", 70),
    priority("operations", "Studio operations", 65),
    priority("growth", "Measured growth", 55),
    priority("cash-flow", "Cash flow", 50),
  ],
  goals: [
    goal("goal:delivery-excellence", "Deliver premium client work on time", "quarter", "primary"),
    goal("goal:relationship-depth", "Deepen long-term client partnerships", "annual", "primary"),
    goal("goal:studio-clarity", "Keep studio execution calm and legible", "near-term", "secondary"),
  ],
  importantDomains: [
    domain("delivery", "Delivery", 90),
    domain("relationships", "Relationships", 85),
    domain("reviews", "Website reviews", 80),
    domain("brand", "Brand", 75),
    domain("operations", "Operations", 70),
    domain("communications", "Communications", 65),
    domain("financial-health", "Financial health", 60),
    domain("marketing", "Marketing", 50),
  ],
  successIndicators: [
    success(
      "success:ontime-delivery",
      "On-time delivery",
      "delivery",
      "Client commitments ship when promised.",
    ),
    success(
      "success:review-clarity",
      "Clear review flow",
      "reviews",
      "Website review cycles stay organized and responsive.",
    ),
    success(
      "success:relationship-trust",
      "Relationship trust",
      "relationships",
      "Clients feel informed, supported, and in partnership.",
    ),
    success(
      "success:calm-operations",
      "Calm operations",
      "operations",
      "Studio load remains legible without chronic strain.",
    ),
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

/** Reference preset — creative agency interpretation lens */
export const CREATIVE_AGENCY_CONTEXT: BusinessContext = {
  ...KXD_STUDIO_BUSINESS_CONTEXT,
  id: "business-context:preset:creative-agency",
  businessName: "Creative Agency",
  industry: "Creative services",
  businessModel: "creative-agency",
  operatingStyle: "project-based",
};

/** Reference preset — construction company interpretation lens */
export const CONSTRUCTION_CONTEXT: BusinessContext = {
  id: "business-context:preset:construction",
  businessName: "Construction Company",
  industry: "Construction",
  businessModel: "construction",
  operatingStyle: "project-based",
  maturity: "established",
  priorities: [
    priority("delivery", "Schedule adherence", 95),
    priority("operations", "Field operations", 90),
    priority("cash-flow", "Cash flow", 85),
    priority("quality", "Build quality", 80),
    priority("relationships", "Client & subcontractor trust", 75),
    {
      id: "priority:safety-compliance",
      key: "operations",
      label: "Safety compliance",
      weight: 70,
    },
    priority("revenue", "Project margin", 65),
    priority("growth", "Pipeline", 50),
  ],
  goals: [
    goal("goal:schedule", "Keep projects on schedule", "quarter", "primary"),
    goal("goal:commitments", "Honor client commitments", "near-term", "primary"),
    goal("goal:margin", "Protect project margin", "quarter", "secondary"),
  ],
  importantDomains: [
    domain("delivery", "Schedule", 95),
    domain("operations", "Field operations", 90),
    domain("financial-health", "Project finance", 85),
    domain("relationships", "Client relationships", 75),
    domain("communications", "Site communications", 70),
    domain("brand", "Reputation", 60),
    domain("marketing", "Bids & pipeline", 55),
    domain("reviews", "Inspections", 50),
  ],
  successIndicators: [
    success(
      "success:schedule-variance",
      "Low schedule variance",
      "delivery",
      "Projects stay within planned timelines.",
    ),
    success(
      "success:commitment-trust",
      "Commitment trust",
      "relationships",
      "Clients trust schedule and scope communication.",
    ),
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

/** Reference preset — restaurant opening interpretation lens */
export const RESTAURANT_OPENING_CONTEXT: BusinessContext = {
  id: "business-context:preset:restaurant-opening",
  businessName: "Restaurant Opening",
  industry: "Hospitality",
  businessModel: "restaurant",
  operatingStyle: "launch-driven",
  maturity: "early",
  priorities: [
    priority("delivery", "Launch readiness", 95),
    priority("operations", "Opening operations", 90),
    priority("brand", "Brand launch", 85),
    priority("cash-flow", "Opening budget", 80),
    priority("relationships", "Community & partners", 70),
    priority("quality", "Guest experience", 70),
    priority("growth", "Opening momentum", 65),
    priority("revenue", "Early revenue", 60),
  ],
  goals: [
    goal("goal:launch-date", "Open on target date", "near-term", "primary"),
    goal("goal:guest-experience", "Deliver a strong first impression", "near-term", "primary"),
    goal("goal:operational-readiness", "Operations ready for day one", "quarter", "secondary"),
  ],
  importantDomains: [
    domain("delivery", "Launch timeline", 95),
    domain("operations", "Opening operations", 90),
    domain("brand", "Brand launch", 85),
    domain("financial-health", "Opening budget", 80),
    domain("marketing", "Opening buzz", 75),
    domain("relationships", "Community", 65),
    domain("communications", "Vendor coordination", 60),
    domain("reviews", "Early feedback", 55),
  ],
  successIndicators: [
    success(
      "success:launch-readiness",
      "Launch readiness",
      "delivery",
      "Opening milestones are on track.",
    ),
    success(
      "success:first-impression",
      "Strong first impression",
      "brand",
      "Opening experience reflects the intended brand.",
    ),
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

export const BUSINESS_CONTEXT_PRESETS: Record<BusinessModel, BusinessContext | undefined> = {
  "creative-agency": CREATIVE_AGENCY_CONTEXT,
  construction: CONSTRUCTION_CONTEXT,
  restaurant: RESTAURANT_OPENING_CONTEXT,
  "professional-services": undefined,
  retail: undefined,
  saas: undefined,
  custom: undefined,
};

export function createDefaultBusinessContext(): BusinessContext {
  return {
    ...KXD_STUDIO_BUSINESS_CONTEXT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
