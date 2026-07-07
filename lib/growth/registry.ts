import type { ClientSuccessCategory } from "./types";

export interface ClientSuccessCategoryDefinition {
  id: ClientSuccessCategory;
  label: string;
  description: string;
  /** Operational health — not sales */
  isOperational: boolean;
  /** Requires evidence / "why now?" when creating items */
  requiresEvidence: boolean;
  /** Items should be rare — dashboard stays clean */
  expectSparse: boolean;
}

/**
 * Executive Client Success — four categories.
 * Growth Opportunities is intentionally rare; most clients have zero active opportunities.
 */
export const CLIENT_SUCCESS_CATEGORIES: Record<
  ClientSuccessCategory,
  ClientSuccessCategoryDefinition
> = {
  "attention-needed": {
    id: "attention-needed",
    label: "Attention Needed",
    description:
      "Operational issues requiring action — website offline, SSL expiring, client waiting, deliverables overdue.",
    isOperational: true,
    requiresEvidence: true,
    expectSparse: false,
  },
  recommendations: {
    id: "recommendations",
    label: "Recommendations",
    description:
      "Professional advisory suggestions — no proposal required. Testimonials, copy, schema, page speed.",
    isOperational: false,
    requiresEvidence: false,
    expectSparse: false,
  },
  "growth-opportunities": {
    id: "growth-opportunities",
    label: "Growth Opportunities",
    description:
      "Genuine business expansion signals only. Must answer: why now? Most clients should have zero active opportunities.",
    isOperational: false,
    requiresEvidence: true,
    expectSparse: true,
  },
  wins: {
    id: "wins",
    label: "Wins",
    description: "Measurable client success — launches, leads, traffic, reviews, rankings, revenue milestones.",
    isOperational: false,
    requiresEvidence: true,
    expectSparse: false,
  },
};

/** Terminal statuses — items must not accumulate indefinitely (Phase 12A.3+). */
export const CLIENT_SUCCESS_TERMINAL_STATUSES = [
  "converted",
  "dismissed",
  "archived",
  "expired",
] as const;

export const GROWTH_OPPORTUNITY_LIFECYCLE = [
  "identified",
  "qualified",
  "offer-draft",
  "offered",
  "won",
  "lost",
  "dismissed",
  "archived",
  "expired",
  "snoozed",
] as const;
