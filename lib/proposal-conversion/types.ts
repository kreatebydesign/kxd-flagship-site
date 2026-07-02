export type ConversionMode =
  | "new-client"
  | "existing-client"
  | "project-expansion"
  | "retainer-only"
  | "one-time"
  | "hybrid";

export type ConversionStatus = "pending" | "in-progress" | "completed" | "failed";

export type LaunchStatus = "queued" | "in-progress" | "completed";

export interface ConversionResultPayload {
  clientId?: number;
  projectId?: number;
  retainerId?: number;
  contractId?: number;
  onboardingId?: number;
  kickoffId?: number;
  infrastructureId?: number;
  executiveProfileId?: number;
  portalUserId?: number;
  actionIds?: number[];
  conversionMode?: ConversionMode;
}

export interface ConversionEngineResult {
  success: boolean;
  alreadyExecuted: boolean;
  conversionId?: number;
  clientId?: number;
  projectId?: number;
  retainerId?: number;
  contractId?: number;
  onboardingId?: number;
  launchStatus?: LaunchStatus;
  errors: string[];
  result?: ConversionResultPayload;
}

export interface ConversionIntelligenceSignal {
  id: string;
  label: string;
  reason: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  clientId?: number;
  proposalId?: number;
  contractId?: number;
  href?: string;
}

export interface ConversionIntelligenceSnapshot {
  signals: ConversionIntelligenceSignal[];
  generatedAt: string;
}

export interface WorkspaceConversionRow {
  id: number;
  proposalId: number;
  proposalTitle: string;
  status: ConversionStatus;
  conversionMode: ConversionMode;
  launchStatus: LaunchStatus;
  convertedAt: string | null;
  href: string;
}

export interface WorkspaceContractRow {
  id: number;
  title: string;
  status: string;
  displayStatus: string;
  contractType: string | null;
  proposalId: number | null;
  proposalTitle: string | null;
  monthlyAmount: number | null;
  projectAmount: number | null;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  signerName: string | null;
  href: string;
}

export interface WorkspaceContractsSnapshot {
  current: WorkspaceContractRow | null;
  contracts: WorkspaceContractRow[];
  conversions: WorkspaceConversionRow[];
  unsignedCount: number;
  signedCount: number;
}

export interface ExecutiveConversionWidgetItem {
  id: number;
  clientId: number | null;
  clientName: string;
  title: string;
  status: string;
  amount: number | null;
  href: string;
  bucket: "ready" | "converted" | "contracts" | "signed" | "launch";
}

export interface ExecutiveConversionWidget {
  readyToConvert: ExecutiveConversionWidgetItem[];
  recentlyConverted: ExecutiveConversionWidgetItem[];
  contractsAwaitingSignature: ExecutiveConversionWidgetItem[];
  signedToday: ExecutiveConversionWidgetItem[];
  launchQueue: ExecutiveConversionWidgetItem[];
  conversionValue: number;
  totals: {
    ready: number;
    converted: number;
    contracts: number;
    signed: number;
    launch: number;
  };
}
