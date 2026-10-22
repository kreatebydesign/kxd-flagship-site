export type PayPeriodWorkflowState = "recorded" | "reviewed" | "payable";

export type PayPeriodExceptionKind =
  | "active_shift_in_period"
  | "missing_shift_boundaries"
  | "pay_period_mismatch"
  | "shift_corrected"
  | "overlap_suspected"
  | "missing_or_unverified_time"
  | "overtime_review_required";

export interface PayPeriodListItem {
  id: number;
  label: string;
  periodStart: string;
  periodEnd: string;
  payday: string;
  periodKind: string;
  workflowState: PayPeriodWorkflowState;
}

export interface PayPeriodReviewAuditEvent {
  id: string;
  at: string;
  actorUserId: number;
  action: string;
  note: string | null;
  detail: Record<string, unknown> | null;
}

export interface PayPeriodShiftLine {
  shiftId: number;
  localDateKey: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  minutes: number;
  hourlyRateCents: number;
  preliminaryGrossCents: number;
  hasCorrectionAudit: boolean;
  payPeriodId: number | null;
}

export interface WorkweekOvertimeWarningView {
  workweekStart: string;
  workweekEnd: string;
  totalMinutes: number;
  weeklyLimitMinutes: number;
  exceedsLimit: boolean;
}

export interface PayPeriodEmployeeSummary {
  staffUserId: number;
  displayName: string;
  email: string;
  employmentStart: string | null;
  totalMinutes: number;
  preliminaryStraightTimeGrossCents: number;
  /** @deprecated alias — use preliminaryStraightTimeGrossCents */
  preliminaryGrossCents: number;
  shiftCount: number;
  workweekOvertimeWarnings: WorkweekOvertimeWarningView[];
  daily: Array<{
    localDateKey: string;
    minutes: number;
    preliminaryGrossCents: number;
    shifts: PayPeriodShiftLine[];
  }>;
  exceptions: Array<{
    kind: PayPeriodExceptionKind;
    message: string;
  }>;
  missingOrUnverifiedDateKeys: string[];
}

export interface PayPeriodReviewPayload {
  period: PayPeriodListItem;
  weeklyHoursLimit: number;
  preliminaryDisclaimer: string;
  employees: PayPeriodEmployeeSummary[];
  periodExceptions: Array<{
    kind: PayPeriodExceptionKind;
    message: string;
  }>;
  review: {
    workflowState: PayPeriodWorkflowState;
    reviewedAt: string | null;
    reviewedByUserId: number | null;
    reviewedByLabel: string | null;
    auditEvents: PayPeriodReviewAuditEvent[];
    /** Fingerprint stored at last acknowledgment. */
    dataFingerprint: string | null;
    /** Fingerprint of current ledger (always computed on load). */
    currentDataFingerprint: string;
    reviewMatchesCurrentData: boolean;
  };
  missingDayDisclaimer: string;
}
