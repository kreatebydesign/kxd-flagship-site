export type StaffWagePaymentStatus = "recorded" | "voided";

export type StaffWagePaymentMethod =
  | "zelle"
  | "ach"
  | "check"
  | "cash"
  | "wire"
  | "cash-app"
  | "other";

export type StaffWageAllocationSourceKind = "time_shift" | "historical_entry";

export type StaffWageAllocationStatus = "active" | "voided";

export type StaffWagePaymentAuditEvent = {
  id: string;
  at: string;
  actorUserId: number;
  action: string;
  note: string | null;
  detail: Record<string, unknown> | null;
};

export type StaffWagePaymentView = {
  id: number;
  staffUserId: number;
  totalCents: number;
  paymentMethod: StaffWagePaymentMethod;
  officialPayrollDate: string;
  settledAt: string;
  externalReference: string;
  status: StaffWagePaymentStatus;
  ownerNote: string | null;
  recordedByUserId: number;
  allocationCount: number;
};

export type StaffWagePaymentAllocationView = {
  id: number;
  wagePaymentId: number;
  staffUserId: number;
  sourceKind: StaffWageAllocationSourceKind;
  shiftId: number | null;
  historicalEntryId: number | null;
  payPeriodId: number | null;
  localDateKey: string;
  payableMinutes: number;
  hourlyRateCents: number;
  grossCents: number;
  status: StaffWageAllocationStatus;
};

export type StaffWageSettlementTotals = {
  documentedGrossCents: number;
  settledGrossCents: number;
  outstandingGrossCents: number;
  documentedMinutes: number;
  settledMinutes: number;
  outstandingMinutes: number;
};

export type StaffWagePayableSourceRef =
  | { sourceKind: "time_shift"; shiftId: number }
  | { sourceKind: "historical_entry"; historicalEntryId: number };

export type RecordStaffWagePaymentInput = {
  staffUserId: number;
  paymentMethod: StaffWagePaymentMethod;
  officialPayrollDate: string;
  settledAt: string;
  externalReference: string;
  ownerNote?: string | null;
  allocations: StaffWagePayableSourceRef[];
};

export const STAFF_WAGE_PAYMENT_METHODS: readonly StaffWagePaymentMethod[] = [
  "zelle",
  "ach",
  "check",
  "cash",
  "wire",
  "cash-app",
  "other",
] as const;

export const WAGE_PAYMENT_DISCLAIMER =
  "External wage payments record off-platform settlements only. Not tax withholding, net pay, or payment authorization.";

/** Edition 1: one active allocation per shift or historical row (full documented gross for that source). */
export const WAGE_PAYMENT_V1_SOURCE_RULE =
  "Each shift or historical duration must be settled in full by a single external payment allocation. Use separate payments for different sources; a source cannot be split across payments.";

export const STAFF_WAGE_SELF_VIEW_DISCLAIMER =
  "Settled wages are amounts KXD OS has recorded as paid externally. This is not net pay and does not include taxes or deductions.";
