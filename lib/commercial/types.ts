/**
 * Mission 003B — Commercial Truth foundation types.
 * Classification and Money Moves states. Does not invent revenue.
 */

export const COMMERCIAL_CATEGORIES = [
  "active_recurring",
  "active_project",
  "performance",
  "annual_only",
  "pipeline",
  "historical",
  "review_required",
] as const;

export type CommercialCategory = (typeof COMMERCIAL_CATEGORIES)[number];

export const PRICING_CLASSIFICATIONS = [
  "standard",
  "custom",
  "legacy",
  "grandfathered",
  "friends_family",
] as const;

export type PricingClassification = (typeof PRICING_CLASSIFICATIONS)[number];

/** Money Moves item states — operator action clarity, not CRM stages. */
export const MONEY_MOVE_STATES = [
  "COLLECTIBLE",
  "UPCOMING",
  "PENDING_TRIGGER",
  "RENEWAL",
  "VARIABLE_NEEDS_CONFIRMATION",
  "PLANNED",
  "REVIEW_REQUIRED",
] as const;

export type MoneyMoveState = (typeof MONEY_MOVE_STATES)[number];

export const HOSTING_AUTO_CHARGE_MODES = [
  "unknown",
  "manual",
  "invoice",
  "authorized_auto",
] as const;

export type HostingAutoChargeMode = (typeof HOSTING_AUTO_CHARGE_MODES)[number];

export const HOSTING_RENEWAL_LIFECYCLE = [
  "unknown",
  "upcoming",
  "notice_due",
  "notice_sent",
  "renewal_scheduled",
  "charge_due",
  "paid",
  "next_renewal",
] as const;

export type HostingRenewalLifecycle = (typeof HOSTING_RENEWAL_LIFECYCLE)[number];

export type MoneyMoveKind =
  | "project_balance"
  | "obligation_due"
  | "active_mrr"
  | "pending_mrr"
  | "planned_mrr_increase"
  | "annual_renewal"
  | "commission"
  | "commercial_review"
  | "accepted_awaiting_start";

export type MoneyMoveItem = {
  id: string;
  clientId: number;
  clientName: string;
  kind: MoneyMoveKind;
  state: MoneyMoveState;
  title: string;
  detail: string;
  amountCents: number | null;
  /** When amount is not booked revenue (planned / variable / missing). */
  amountIsBooked: boolean;
  dueDate: string | null;
  serviceStartDate: string | null;
  href: string;
  authority: string;
};

export type CommercialTotals = {
  currentVerifiedMrrCents: number;
  pendingFutureMrrCents: number;
  annualRecurringCents: number;
  variablePerformanceCents: number;
  projectReceivablesCents: number;
  missingAuthorityCount: number;
};

export type SalesMemoryKind =
  | "proposal_follow_up"
  | "payment_promised"
  | "future_price_trigger"
  | "renewal_approaching"
  | "commission_awaiting_confirmation"
  | "client_commercial_review"
  | "project_launch_unlocks_recurring"
  | "operator_note";

export type SalesMemoryItem = {
  id: string;
  clientId: number | null;
  clientName: string | null;
  kind: SalesMemoryKind;
  title: string;
  summary: string;
  occurredAt: string;
  actionable: boolean;
  href: string | null;
  source: "derived" | "operator";
};

export type HostingCommercialAuthority = {
  clientId: number;
  clientName: string;
  serviceTitle: string;
  status: "active" | "pending_trigger" | "unknown" | "missing_authority";
  serviceStartDate: string | null;
  billingDueDate: string | null;
  renewalDate: string | null;
  annualAmountCents: number | null;
  amountAuthority: "contract" | "infrastructure" | "missing";
  autoChargeMode: HostingAutoChargeMode;
  renewalLifecycle: HostingRenewalLifecycle;
  noticeSentAt: string | null;
  domainAnnualCents: number | null;
};
