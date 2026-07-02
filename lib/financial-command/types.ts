export type RevenueEventType =
  | "revenue.proposal-approved"
  | "revenue.proposal-converted"
  | "revenue.contract-signed"
  | "revenue.retainer-started"
  | "revenue.retainer-renewed"
  | "revenue.retainer-ended"
  | "revenue.project-launched"
  | "revenue.project-completed"
  | "billing.setup-missing"
  | "revenue.at-risk"
  | "revenue.recovered";

export type FinancialSnapshotType =
  | "executive"
  | "client"
  | "mrr"
  | "pipeline"
  | "contracted"
  | "renewal"
  | "at-risk";

export type BillingStatus =
  | "not-configured"
  | "partial"
  | "active"
  | "paused"
  | "archived";

export interface ExecutiveFinancialMetrics {
  mrr: number;
  activeRetainers: number;
  oneTimeProjectRevenue: number;
  pipelineValue: number;
  contractedRevenue: number;
  projectedAnnualValue: number;
  atRiskRevenue: number;
  missingBillingSetup: number;
  upcomingRenewals: number;
  revenueByClient: Array<{ clientId: number; clientName: string; mrr: number; total: number }>;
  revenueByServiceType: Array<{ serviceType: string; amount: number }>;
}

export interface ExecutiveFinancialWidget {
  mrr: number;
  pipelineValue: number;
  contractedRevenue: number;
  projectedAnnualValue: number;
  activeRetainers: number;
  atRiskRevenue: number;
  missingBillingSetup: number;
  upcomingRenewals: number;
  alerts: ExecutiveFinancialAlert[];
  topClientsByRevenue: ExecutiveFinancialClientRow[];
  generatedAt: string;
}

export interface ExecutiveFinancialAlert {
  id: string;
  label: string;
  detail: string;
  amount: number | null;
  priority: "low" | "medium" | "high" | "critical";
  href: string;
}

export interface ExecutiveFinancialClientRow {
  clientId: number;
  clientName: string;
  mrr: number;
  lifetimeValue: number;
  href: string;
}

export interface WorkspaceBillingProfile {
  id: number | null;
  billingContact: string | null;
  billingEmail: string | null;
  paymentPreference: string | null;
  invoiceCadence: string | null;
  paymentTerms: string | null;
  billingStatus: BillingStatus;
  missingSetupFlags: string[];
  setupComplete: boolean;
}

export interface WorkspaceRevenueEventRow {
  id: number;
  eventType: string;
  displayType: string;
  title: string;
  amount: number | null;
  occurredAt: string;
}

export interface WorkspaceFinancialSnapshot {
  mrr: number;
  lifetimeValue: number;
  contractedValue: number;
  pipelineValue: number;
  projectValue: number;
  activeRetainers: number;
  billingProfile: WorkspaceBillingProfile;
  renewalStatus: string;
  atRiskAmount: number;
  healthScore: number;
  riskLevel: string;
  revenueEvents: WorkspaceRevenueEventRow[];
  revenueByServiceType: Array<{ serviceType: string; amount: number }>;
}

export interface FinancialIntelligenceSignal {
  id: string;
  label: string;
  reason: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  clientId: number;
  href?: string;
}

export interface FinancialIntelligenceSnapshot {
  signals: FinancialIntelligenceSignal[];
  generatedAt: string;
  aiReady: boolean;
}

export interface FinancialCommandResponse {
  executive: ExecutiveFinancialMetrics;
  snapshotId?: number;
  generatedAt: string;
}
