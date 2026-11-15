export type StaffEmploymentAuthorizationStatus =
  | "pending"
  | "authorized"
  | "blocked"
  | "expired";

export type StaffPaidShiftActivation = "blocked" | "allowed";

export type StaffEmploymentComplianceAuditEvent = {
  id: string;
  at: string;
  actorUserId: number;
  action: string;
  note: string | null;
  detail: Record<string, unknown> | null;
};

export type StaffEmploymentComplianceRecord = {
  id: number;
  staffUserId: number;
  employmentAuthorizationStatus: StaffEmploymentAuthorizationStatus;
  oregonPermitConfirmed: boolean;
  permitEffectiveDate: string | null;
  permitExpirationDate: string | null;
  approvedWorkCategories: string[];
  schoolDayMaxMinutes: number | null;
  nonSchoolDayMaxMinutes: number | null;
  weeklyMaxMinutes: number | null;
  schoolDayEarliestStartLocal: string | null;
  schoolDayLatestEndLocal: string | null;
  nonSchoolDayEarliestStartLocal: string | null;
  nonSchoolDayLatestEndLocal: string | null;
  schedulingRules: Record<string, unknown>;
  paidShiftActivation: StaffPaidShiftActivation;
  payrollSetupConfirmed: boolean;
  ownerHourlyRateConfirmed: boolean;
  ownerComplianceNote: string | null;
  auditEvents: StaffEmploymentComplianceAuditEvent[];
  lastUpdatedByUserId: number | null;
  updatedAt: string;
  createdAt: string;
};

/** Minimal self-view — no permit numbers or owner notes. */
export type StaffPaidShiftSelfStatus = {
  paidShiftsAllowed: boolean;
  statusLabel: string;
  complianceMigrationReady: boolean;
};

export type UpsertStaffEmploymentComplianceInput = {
  staffUserId: number;
  employmentAuthorizationStatus: StaffEmploymentAuthorizationStatus;
  oregonPermitConfirmed: boolean;
  permitEffectiveDate?: string | null;
  permitExpirationDate?: string | null;
  approvedWorkCategories: string[];
  schoolDayMaxMinutes?: number | null;
  nonSchoolDayMaxMinutes?: number | null;
  weeklyMaxMinutes?: number | null;
  schoolDayEarliestStartLocal?: string | null;
  schoolDayLatestEndLocal?: string | null;
  nonSchoolDayEarliestStartLocal?: string | null;
  nonSchoolDayLatestEndLocal?: string | null;
  schedulingRules?: Record<string, unknown>;
  paidShiftActivation: StaffPaidShiftActivation;
  payrollSetupConfirmed: boolean;
  ownerHourlyRateConfirmed: boolean;
  ownerComplianceNote?: string | null;
};

export const STAFF_COMPLIANCE_DISCLAIMER =
  "Owner-managed compliance record for minor/family employment. Not legal advice. Does not determine tax or payroll filings.";