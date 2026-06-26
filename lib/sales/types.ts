// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SalesDoc = Record<string, any>;

export const PIPELINE_COLUMNS = [
  { id: "new", label: "New" },
  { id: "discovery", label: "Discovery" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

export type PipelineStatus = (typeof PIPELINE_COLUMNS)[number]["id"] | "nurturing";

export const LEAD_STATUSES = [
  "new",
  "discovery",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "nurturing",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "approved",
  "rejected",
  "expired",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "call",
  "meeting",
  "email",
  "proposal-sent",
  "proposal-viewed",
  "follow-up",
  "note",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ProposalSectionBlock {
  sectionId?: number;
  category: string;
  title: string;
  content: string;
  price?: number;
  isRecurring?: boolean;
  optional?: boolean;
  sortOrder: number;
}

export interface OptionalService {
  title: string;
  description?: string;
  price: number;
  isRecurring?: boolean;
}

export interface PipelineColumn {
  status: PipelineStatus;
  label: string;
  leads: SalesDoc[];
  totalValue: number;
}

export interface PipelineBoardData {
  columns: PipelineColumn[];
  totalLeads: number;
  totalPipelineValue: number;
}

export interface ForecastMetrics {
  pipelineValue: number;
  expectedMRR: number;
  weightedPipelineValue: number;
  averageDealSize: number;
  averageProbability: number;
  openOpportunities: number;
  monthlyForecast: { month: string; value: number }[];
  topOpportunities: {
    id: number;
    companyName: string;
    status: string;
    estimatedValue: number;
    estimatedMRR: number;
    probability: number;
    weightedValue: number;
  }[];
}

export interface ProposalConversionDraft {
  preparedAt: string;
  proposalId: number;
  proposalNumber: string;
  status: "prepared";
  client: Record<string, unknown>;
  executiveProfile: Record<string, unknown>;
  infrastructure: Record<string, unknown>;
  timelineEvent: Record<string, unknown>;
  retainer: Record<string, unknown>;
  project: Record<string, unknown>;
  onboarding: Record<string, unknown>;
  notes: string[];
}

export interface SalesDashboardStats {
  leads: number;
  proposals: number;
  openPipeline: number;
  wonThisQuarter: number;
}
