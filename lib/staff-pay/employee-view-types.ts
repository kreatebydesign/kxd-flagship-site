import type {
  PayPeriodListItem,
  PayPeriodShiftLine,
  PayPeriodWorkflowState,
} from "./types";

export type StaffMyTimePayShiftView = PayPeriodShiftLine & {
  employeeAcknowledged: boolean;
  openDisputeRequestId: number | null;
};

export type StaffMyTimePayPeriodView = {
  period: PayPeriodListItem;
  hourlyRateCents: number;
  employmentStart: string | null;
  verifiedTotalMinutes: number;
  verifiedPreliminaryGrossCents: number;
  verifiedShiftCount: number;
  daily: Array<{
    localDateKey: string;
    minutes: number;
    preliminaryGrossCents: number;
    shifts: StaffMyTimePayShiftView[];
  }>;
  reviewWorkflowState: PayPeriodWorkflowState;
  scheduledPayday: string;
  paymentStatusLabel: string;
  periodOpen: boolean;
  periodOpenNote: string | null;
};

export type StaffMyTimePaySummaryTotals = {
  verifiedPreliminaryGrossCents: number;
  ownerApprovedHistoricalGrossCents: number | null;
  ownerApprovedHistoricalMinutes: number | null;
  pendingProposedHistoricalGrossCents: number | null;
  documentedGrossSubtotalCents: number | null;
  combinedIllustrativeDisclaimer: string;
  /** @deprecated use ownerApprovedHistoricalGrossCents */
  provisionalHistoricalGrossCents?: number | null;
  combinedIllustrativeGrossCents?: number | null;
};

export type StaffMyTimePayPageData = {
  viewer: { userId: number; displayName: string };
  hourlyRateCents: number;
  grossBeforeTaxDisclaimer: string;
  preliminaryDisclaimer: string;
  paymentRecordedDisclaimer: string;
  periods: StaffMyTimePayPeriodView[];
  provisionalHistorical: import("./provisional-historical").ProvisionalHistoricalSummary | null;
  ownerApprovedHistoricalEntries: import("./historical-entries").StaffPayHistoricalEntryView[];
  oct21Reconciliation: typeof import("./tyler-payroll-reconciliation").TYLER_OCT_21_2026_RECONCILIATION;
  summaryTotals: StaffMyTimePaySummaryTotals;
  myRequests: StaffTimePayRequestView[];
  documentedOutsideClockEvents: import("./documented-outside-clock").DocumentedOutsideClockEvent[];
};

export type StaffTimePayRequestKind =
  | "shift_acknowledgment"
  | "correction_dispute"
  | "historical_backfill"
  | "historical_timesheet_acknowledgment";

export type StaffTimePayRequestStatus =
  | "submitted"
  | "under_review"
  | "resolved"
  | "withdrawn";

export type StaffTimePayRequestView = {
  id: number;
  requestKind: StaffTimePayRequestKind;
  shiftId: number | null;
  localDateKey: string;
  payPeriodId: number | null;
  proposedStartAt: string | null;
  proposedEndAt: string | null;
  employeeNote: string;
  status: StaffTimePayRequestStatus;
  ownerNote: string | null;
  resolutionKind: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type StaffTimePayRequestAuditEvent = {
  id: string;
  at: string;
  actorUserId: number;
  action: string;
  note: string | null;
};
