/**
 * Client-safe exports for financial command.
 */
export type {
  BillingStatus,
  ExecutiveFinancialAlert,
  ExecutiveFinancialClientRow,
  ExecutiveFinancialMetrics,
  ExecutiveFinancialWidget,
  FinancialCommandResponse,
  FinancialIntelligenceSignal,
  FinancialIntelligenceSnapshot,
  FinancialSnapshotType,
  RevenueEventType,
  WorkspaceBillingProfile,
  WorkspaceFinancialSnapshot,
  WorkspaceRevenueEventRow,
} from "./types";

export {
  BILLING_STATUS_LABELS,
  REVENUE_EVENT_LABELS,
  displayBillingStatus,
  displayRevenueEventType,
  fmtFinancialMoney,
} from "./lifecycle";
