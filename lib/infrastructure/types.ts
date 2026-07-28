import type { ClientResourceDirectory } from "./client-resource-directory";
import type { HostingRenewalReadiness } from "./hosting-renewal-readiness";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InfraDoc = Record<string, any>;

export type InfrastructureStatus = "healthy" | "attention" | "critical" | "unknown";

export interface InfrastructureHealthSignal {
  id: string;
  label: string;
  value: string;
  status: "ok" | "warning" | "critical" | "unknown";
}

export interface InfrastructureDashboardData {
  overallHealthScore: number | null;
  overallHealthLabel: string;
  totalClientsTracked: number;
  criticalIssues: number;
  /** @deprecated Prefer hostingRenewalWatchlist — retained for compatibility. */
  upcomingRenewals: InfraDoc[];
  /** Hosting/domain renewal readiness rows (past-due, soon, and missing included). */
  hostingRenewalWatchlist: Array<InfraDoc & { readiness: HostingRenewalReadiness }>;
  monthlyStackCost: number;
  annualStackCost: number;
  marginOpportunity: number | null;
  records: InfraDoc[];
  clients: InfraDoc[];
  criticalEvents: InfraDoc[];
  recentEvents: InfraDoc[];
  statusCounts: Record<InfrastructureStatus, number>;
}

export interface ClientInfrastructureDetail {
  record: InfraDoc | null;
  client: InfraDoc;
  costs: InfraDoc[];
  events: InfraDoc[];
  healthSignals: InfrastructureHealthSignal[];
  hostingRenewalReadiness: HostingRenewalReadiness;
  /** Allowlisted operator resource directory — no secrets or free-form notes. */
  clientResourceDirectory: ClientResourceDirectory;
  score: number | null;
  monthlyCost: number;
  annualCost: number;
}
