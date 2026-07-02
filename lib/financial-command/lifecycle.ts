import type { BillingStatus, RevenueEventType } from "./types";

export const REVENUE_EVENT_LABELS: Record<RevenueEventType, string> = {
  "revenue.proposal-approved": "Proposal Approved",
  "revenue.proposal-converted": "Proposal Converted",
  "revenue.contract-signed": "Contract Signed",
  "revenue.retainer-started": "Retainer Started",
  "revenue.retainer-renewed": "Retainer Renewed",
  "revenue.retainer-ended": "Retainer Ended",
  "revenue.project-launched": "Project Launched",
  "revenue.project-completed": "Project Completed",
  "billing.setup-missing": "Billing Setup Missing",
  "revenue.at-risk": "Revenue At Risk",
  "revenue.recovered": "Revenue Recovered",
};

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  "not-configured": "Not Configured",
  partial: "Partial",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export function displayRevenueEventType(type: string): string {
  return REVENUE_EVENT_LABELS[type as RevenueEventType] ?? type.replace(/[.-]/g, " ");
}

export function displayBillingStatus(status: string): string {
  return BILLING_STATUS_LABELS[status as BillingStatus] ?? status.replace(/-/g, " ");
}

export function fmtFinancialMoney(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
