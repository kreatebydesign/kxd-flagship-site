/**
 * Phase 12A — Client Success layer types.
 * Growth Opportunities is one category within Executive Client Success.
 */

export type ClientSuccessCategory =
  | "attention-needed"
  | "recommendations"
  | "growth-opportunities"
  | "wins";

export type ClientSuccessItemStatus =
  | "active"
  | "qualified"
  | "converted"
  | "dismissed"
  | "archived"
  | "expired"
  | "snoozed";

/** Reserved for Phase 12A.3+ — persisted client success records. */
export interface ClientSuccessItemDefinition {
  id: string;
  category: ClientSuccessCategory;
  clientId?: number | null;
  title: string;
  summary: string;
  status: ClientSuccessItemStatus;
  /** Growth opportunities only — required evidence for "why now?" */
  evidence?: string;
  /** Internal scoring — not surfaced prominently in UI */
  confidence?: "low" | "medium" | "high";
  estimatedValue?: number;
}

export type GrowthOpportunityLifecycleStatus =
  | "identified"
  | "qualified"
  | "offer-draft"
  | "offered"
  | "won"
  | "lost"
  | "dismissed"
  | "archived"
  | "expired"
  | "snoozed";
