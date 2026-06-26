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
  upcomingRenewals: InfraDoc[];
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
  score: number | null;
  monthlyCost: number;
  annualCost: number;
}
