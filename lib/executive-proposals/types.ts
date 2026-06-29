export const EXECUTIVE_PROPOSAL_STATUSES = [
  "draft",
  "internal-review",
  "sent",
  "viewed",
  "questions",
  "revision-requested",
  "approved",
  "declined",
  "rejected",
  "expired",
  "archived",
] as const;

export type ExecutiveProposalStatus = (typeof EXECUTIVE_PROPOSAL_STATUSES)[number];

export const EXECUTIVE_PROPOSAL_TYPES = [
  "website",
  "branding",
  "marketing-retainer",
  "crm-automation",
  "consulting",
  "one-time-project",
  "monthly-retainer",
  "custom",
] as const;

export type ExecutiveProposalType = (typeof EXECUTIVE_PROPOSAL_TYPES)[number];

export const ESTIMATE_ITEM_TYPES = [
  "fixed",
  "hourly",
  "monthly-retainer",
  "quantity",
  "optional-upgrade",
] as const;

export type EstimateItemType = (typeof ESTIMATE_ITEM_TYPES)[number];

export type ProposalDoc = Record<string, unknown>;

export interface EstimateItemInput {
  id?: number;
  title: string;
  description?: string | null;
  itemType: EstimateItemType | string;
  quantity?: number | null;
  unitPrice?: number | null;
  hours?: number | null;
  isRecurring?: boolean;
  isOptional?: boolean;
  includedByDefault?: boolean;
  discountable?: boolean;
  sortOrder?: number;
}

export interface PricingTotals {
  oneTimeTotal: number;
  recurringTotal: number;
  optionalOneTimeTotal: number;
  optionalRecurringTotal: number;
  discountAmount: number;
  taxAmount: number;
  grandOneTimeTotal: number;
  grandRecurringTotal: number;
  projectedAnnualValue: number;
  lineCount: number;
}

export interface WorkspaceProposalRow {
  id: number;
  proposalNumber: string;
  title: string;
  status: string;
  displayStatus: string;
  proposalType: string | null;
  oneTimeTotal: number | null;
  recurringTotal: number | null;
  projectedAnnualValue: number | null;
  lastViewedAt: string | null;
  sentAt: string | null;
  expiresAt: string | null;
  approvedAt: string | null;
  approvalStatus: string | null;
  revisionNumber: number;
  href: string;
  builderHref: string;
}

export interface WorkspaceProposalApprovalRow {
  id: number;
  action: string;
  actorName: string | null;
  notes: string | null;
  revisionNumber: number;
  occurredAt: string;
}

export interface WorkspaceProposalsSnapshot {
  current: WorkspaceProposalRow | null;
  proposals: WorkspaceProposalRow[];
  approvals: WorkspaceProposalApprovalRow[];
  openCount: number;
  pendingFollowUpCount: number;
}

export interface ExecutiveProposalsWidgetItem {
  id: number;
  clientId: number | null;
  clientName: string;
  title: string;
  status: string;
  amount: number | null;
  recurring: number | null;
  href: string;
  bucket: "pending" | "viewed" | "follow-up" | "approved" | "expiring";
}

export interface ExecutiveProposalsWidget {
  pending: ExecutiveProposalsWidgetItem[];
  viewed: ExecutiveProposalsWidgetItem[];
  needsFollowUp: ExecutiveProposalsWidgetItem[];
  approvedThisMonth: ExecutiveProposalsWidgetItem[];
  expiring: ExecutiveProposalsWidgetItem[];
  pipelineValue: number;
  forecastRevenue: number;
  totals: {
    pending: number;
    viewed: number;
    needsFollowUp: number;
    approvedThisMonth: number;
    expiring: number;
  };
}

/** Future-ready intelligence signals — no AI execution in Phase 9A. */
export interface ProposalIntelligenceSignal {
  id: string;
  label: string;
  reason: string;
  category: "follow-up" | "pricing" | "bundle" | "retainer" | "upsell-crm" | "upsell-seo";
  priority: "low" | "medium" | "high" | "critical";
  proposalId?: number;
  clientId?: number;
  href?: string;
}

export interface ProposalIntelligenceSnapshot {
  signals: ProposalIntelligenceSignal[];
  generatedAt: string;
  aiReady: boolean;
}
